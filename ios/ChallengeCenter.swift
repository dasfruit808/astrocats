import Foundation

struct ChallengeProgress: Codable, Equatable {
    enum Cadence: String, Codable { case daily, weekly }

    var cadence: Cadence
    var identifier: String
    var progress: Int
    var goal: Int
    var completedAt: Date?
    var seasonIdentifier: String?

    var isComplete: Bool { progress >= goal }
}

struct ChallengeState: Codable, Equatable {
    var daily: [ChallengeProgress]
    var weekly: [ChallengeProgress]
    var lastReset: Date
}

final class ChallengeCenter {
    private let apiClient: AstrocatsAPIClient
    private let profileOwner: String
    private let clock: () -> Date
    private let storageKey: String

    init(apiClient: AstrocatsAPIClient, profileOwner: String, clock: @escaping () -> Date = Date.init) {
        self.apiClient = apiClient
        self.profileOwner = profileOwner
        self.clock = clock
        self.storageKey = "astrocats-challenges-\(profileOwner)"
    }

    func loadState() -> ChallengeState {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode(ChallengeState.self, from: data) else {
            return ChallengeState(daily: [], weekly: [], lastReset: .distantPast)
        }
        return decoded
    }

    func saveState(_ state: ChallengeState) {
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    func resetIfNeeded(currentSeason: String?) -> ChallengeState {
        var state = loadState()
        let now = clock()
        let calendar = Calendar.current
        var didReset = false

        if !calendar.isDate(now, inSameDayAs: state.lastReset) {
            state.daily = []
            didReset = true
        }

        if let week = calendar.dateComponents([.weekOfYear, .yearForWeekOfYear], from: now).date,
           let lastWeek = calendar.dateComponents([.weekOfYear, .yearForWeekOfYear], from: state.lastReset).date,
           week > lastWeek {
            state.weekly = []
            didReset = true
        }

        if didReset {
            state.lastReset = now
            saveState(state)
        }

        if didReset, let season = currentSeason {
            PushNotificationManager.shared.scheduleChallengeResetNotification(seasonIdentifier: season)
        }

        return state
    }

    func recordProgress(_ delta: Int, cadence: ChallengeProgress.Cadence, identifier: String, goal: Int, seasonIdentifier: String?) async {
        var state = resetIfNeeded(currentSeason: seasonIdentifier)
        var collection = cadence == .daily ? state.daily : state.weekly
        let now = clock()
        if let index = collection.firstIndex(where: { $0.identifier == identifier }) {
            collection[index].progress = min(goal, collection[index].progress + delta)
            collection[index].goal = goal
            collection[index].seasonIdentifier = seasonIdentifier
            if collection[index].isComplete && collection[index].completedAt == nil {
                collection[index].completedAt = now
            }
        } else {
            let entry = ChallengeProgress(cadence: cadence, identifier: identifier, progress: min(goal, delta), goal: goal, completedAt: delta >= goal ? now : nil, seasonIdentifier: seasonIdentifier)
            collection.append(entry)
        }

        if cadence == .daily {
            state.daily = collection
        } else {
            state.weekly = collection
        }

        saveState(state)

        if let completed = collection.first(where: { $0.identifier == identifier && $0.isComplete }) {
            await submitCompletionToLeaderboard(progress: completed)
        }
    }

    private func submitCompletionToLeaderboard(progress: ChallengeProgress) async {
        do {
            let stats: [String: Int] = ["challenge_\(progress.identifier)": progress.goal]
            let entry = LeaderboardEntry(publicKey: profileOwner, level: progress.goal, bestScore: progress.goal, stats: stats)
            try await apiClient.submitLeaderboardEntry(entry)
        } catch {
            print("Failed to submit challenge completion: \(error)")
        }
    }

    func syncProfileMetadata(state: ChallengeState, profile: ProfilePayload) async {
        var metadata = profile.metadata ?? [:]
        let encoder = JSONEncoder()
        let dailyData = (try? encoder.encode(state.daily)).flatMap { String(data: $0, encoding: .utf8) }
        let weeklyData = (try? encoder.encode(state.weekly)).flatMap { String(data: $0, encoding: .utf8) }
        if let dailyData { metadata["dailyChallenges"] = AnyCodable(dailyData) }
        if let weeklyData { metadata["weeklyChallenges"] = AnyCodable(weeklyData) }
        let payload = ProfilePayload(name: profile.name, title: profile.title, avatar: profile.avatar, bio: profile.bio, metadata: metadata)

        do {
            try await apiClient.saveProfile(owner: profileOwner, payload: payload)
        } catch {
            print("Challenge metadata sync failed: \(error)")
        }
    }
}
