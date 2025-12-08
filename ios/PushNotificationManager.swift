import Foundation
import UserNotifications

final class PushNotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushNotificationManager()

    private override init() {}

    func registerIfNeeded() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error { print("Notification auth failed: \(error)") }
            if !granted { print("User denied notification permissions") }
        }
    }

    func scheduleChallengeResetNotification(seasonIdentifier: String) {
        let content = UNMutableNotificationContent()
        content.title = "New challenges available"
        content.body = "Daily and weekly objectives have refreshed for season \(seasonIdentifier)."
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: "astrocats.challenge.reset", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func schedulePersonalBestNotification(score: Int, rank: Int?) {
        let content = UNMutableNotificationContent()
        content.title = "New personal best!"
        if let rank {
            content.body = "You reached rank #\(rank) with a score of \(score)."
        } else {
            content.body = "You set a new best score of \(score)."
        }
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: "astrocats.leaderboard.personalbest", content: content, trigger: trigger)
        UNUserNotificationCenter.current().add(request)
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }
}

struct LeaderboardMonitor {
    private let apiClient: AstrocatsAPIClient
    private let cacheKey: String

    init(apiClient: AstrocatsAPIClient, owner: String) {
        self.apiClient = apiClient
        self.cacheKey = "leaderboard-monitor-\(owner)"
    }

    func checkForUpdates(currentSeason: String?) async {
        do {
            let entries = try await apiClient.fetchLeaderboardTop()
            let cached = loadCachedSnapshot()
            saveSnapshot(entries)

            if let best = entries.first(where: { $0.publicKey == cacheKeyOwner }),
               best.bestScore > cached.personalBestScore {
                let rank = entries.firstIndex(where: { $0.publicKey == best.publicKey }).map { $0 + 1 }
                PushNotificationManager.shared.schedulePersonalBestNotification(score: best.bestScore, rank: rank)
            }

            if let season = currentSeason, season != cached.seasonIdentifier {
                PushNotificationManager.shared.scheduleChallengeResetNotification(seasonIdentifier: season)
            }
        } catch {
            print("Leaderboard monitor failed: \(error)")
        }
    }

    private var cacheKeyOwner: String {
        cacheKey.replacingOccurrences(of: "leaderboard-monitor-", with: "")
    }

    private func loadCachedSnapshot() -> LeaderboardSnapshot {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let decoded = try? JSONDecoder().decode(LeaderboardSnapshot.self, from: data) else {
            return LeaderboardSnapshot(seasonIdentifier: nil, personalBestScore: 0)
        }
        return decoded
    }

    private func saveSnapshot(_ entries: [LeaderboardEntry]) {
        let personalBest = entries.first(where: { $0.publicKey == cacheKeyOwner })?.bestScore ?? 0
        let snapshot = LeaderboardSnapshot(seasonIdentifier: nil, personalBestScore: personalBest)
        if let data = try? JSONEncoder().encode(snapshot) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }
}

struct LeaderboardSnapshot: Codable, Equatable {
    var seasonIdentifier: String?
    var personalBestScore: Int
}
