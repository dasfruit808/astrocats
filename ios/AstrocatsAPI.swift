import Foundation

struct AstrocatsAPIConfiguration {
    let host: URL
    let apiBaseOverride: URL?
    let allowApiOnStaticHost: Bool

    init(host: URL, apiBaseOverride: URL? = nil, allowApiOnStaticHost: Bool = false) {
        self.host = host
        self.apiBaseOverride = apiBaseOverride
        self.allowApiOnStaticHost = allowApiOnStaticHost
    }

    private func normalized(_ url: URL) -> URL {
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        if let path = components?.path, path.hasSuffix("/") {
            components?.path = String(path.dropLast())
        }
        return components?.url ?? url
    }

    private func isStaticHost(_ hostname: String) -> Bool {
        return hostname.lowercased().hasSuffix("github.io")
    }

    private func isLocalhost(_ hostname: String) -> Bool {
        return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].contains(hostname.lowercased())
    }

    var apiBaseURL: URL? {
        if let override = apiBaseOverride {
            return normalized(override)
        }

        guard let hostname = host.host else {
            return nil
        }

        if isStaticHost(hostname) && !allowApiOnStaticHost {
            return nil
        }

        if isLocalhost(hostname) {
            return normalized(host.appendingPathComponent("api"))
        }

        return normalized(host.appendingPathComponent("api"))
    }

    var leaderboardBaseURL: URL? {
        guard let apiBaseURL else { return nil }
        return normalized(apiBaseURL.appendingPathComponent("leaderboard"))
    }
}

struct LeaderboardEntry: Codable, Equatable {
    var publicKey: String
    var level: Int
    var bestScore: Int
    var stats: [String: Int]
}

struct ProfilePayload: Codable, Equatable {
    var name: String?
    var title: String?
    var avatar: String?
    var bio: String?
    var metadata: [String: AnyCodable]?

    init(name: String? = nil, title: String? = nil, avatar: String? = nil, bio: String? = nil, metadata: [String: AnyCodable]? = nil) {
        self.name = ProfilePayload.sanitizeName(name)
        self.title = ProfilePayload.sanitizeTitle(title)
        self.avatar = ProfilePayload.sanitizeAvatar(avatar)
        self.bio = ProfilePayload.sanitizeBio(bio)
        self.metadata = metadata
    }

    private static func sanitizeName(_ value: String?) -> String? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
            return nil
        }
        let trimmed = String(value.prefix(12))
        let pattern = "^[A-Za-z0-9 _-]*$"
        if trimmed.range(of: pattern, options: .regularExpression) != nil {
            return trimmed
        }
        return nil
    }

    private static func sanitizeTitle(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        return String(trimmed.prefix(12))
    }

    private static func sanitizeAvatar(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        if trimmed.hasPrefix("data:"), trimmed.count <= 4096 {
            return trimmed
        }
        guard let url = URL(string: trimmed), let scheme = url.scheme else {
            return nil
        }
        if ["http", "https"].contains(scheme.lowercased()) {
            return trimmed
        }
        return nil
    }

    private static func sanitizeBio(_ value: String?) -> String? {
        guard let value else { return nil }
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        return String(trimmed.prefix(280))
    }
}

final class EndpointCache {
    private let cacheDirectory: URL
    private let queue = DispatchQueue(label: "io.astrocats.cache", qos: .utility)

    init(cacheDirectory: URL? = nil) {
        let base = cacheDirectory ?? FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first ?? URL(fileURLWithPath: NSTemporaryDirectory())
        self.cacheDirectory = base.appendingPathComponent("AstrocatsCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: self.cacheDirectory, withIntermediateDirectories: true)
    }

    func store(data: Data, for key: String) {
        queue.async {
            let url = self.cacheDirectory.appendingPathComponent(key)
            try? data.write(to: url, options: .atomic)
        }
    }

    func data(for key: String) -> Data? {
        let url = cacheDirectory.appendingPathComponent(key)
        return try? Data(contentsOf: url)
    }
}

final class AstrocatsAPIClient {
    enum APIError: Error {
        case configurationMissing
        case invalidResponse
    }

    private let configuration: AstrocatsAPIConfiguration
    private let session: URLSession
    private let cache: EndpointCache

    init(configuration: AstrocatsAPIConfiguration, session: URLSession = .shared, cache: EndpointCache = EndpointCache()) {
        self.configuration = configuration
        self.session = session
        self.cache = cache
    }

    private func request(url: URL, cacheKey: String, offlineFallback: Bool = true) async throws -> Data {
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw APIError.invalidResponse
            }
            cache.store(data: data, for: cacheKey)
            return data
        } catch {
            if offlineFallback, let cached = cache.data(for: cacheKey) {
                return cached
            }
            throw error
        }
    }

    func fetchLeaderboardTop() async throws -> [LeaderboardEntry] {
        guard let leaderboardBase = configuration.leaderboardBaseURL else {
            throw APIError.configurationMissing
        }
        let data = try await request(url: leaderboardBase.appendingPathComponent("top"), cacheKey: "leaderboard-top.json")
        let decoded = try JSONDecoder().decode([LeaderboardEntry].self, from: data)
        return decoded.sorted { lhs, rhs in
            if lhs.level != rhs.level { return lhs.level > rhs.level }
            return lhs.bestScore > rhs.bestScore
        }
    }

    func submitLeaderboardEntry(_ entry: LeaderboardEntry) async throws {
        guard let leaderboardBase = configuration.leaderboardBaseURL else {
            throw APIError.configurationMissing
        }

        var request = URLRequest(url: leaderboardBase)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(entry)

        _ = try await session.data(for: request)
    }

    func fetchProfile(owner: String) async throws -> ProfilePayload? {
        guard let apiBaseURL = configuration.apiBaseURL else {
            throw APIError.configurationMissing
        }
        let path = apiBaseURL.appendingPathComponent("profile").appendingPathComponent(owner.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? owner)
        let data = try await request(url: path, cacheKey: "profile-\(owner).json")
        return try JSONDecoder().decode(ProfilePayload.self, from: data)
    }

    func saveProfile(owner: String, payload: ProfilePayload) async throws {
        guard let apiBaseURL = configuration.apiBaseURL else {
            throw APIError.configurationMissing
        }
        let path = apiBaseURL.appendingPathComponent("profile").appendingPathComponent(owner.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? owner)
        var request = URLRequest(url: path)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        _ = try await session.data(for: request)
    }
}

struct AnyCodable: Codable, Equatable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            value = intVal
        } else if let doubleVal = try? container.decode(Double.self) {
            value = doubleVal
        } else if let boolVal = try? container.decode(Bool.self) {
            value = boolVal
        } else if let stringVal = try? container.decode(String.self) {
            value = stringVal
        } else if let arrayVal = try? container.decode([AnyCodable].self) {
            value = arrayVal.map { $0.value }
        } else if let dictVal = try? container.decode([String: AnyCodable].self) {
            value = dictVal.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let intVal as Int:
            try container.encode(intVal)
        case let doubleVal as Double:
            try container.encode(doubleVal)
        case let boolVal as Bool:
            try container.encode(boolVal)
        case let stringVal as String:
            try container.encode(stringVal)
        case let arrayVal as [Any]:
            try container.encode(arrayVal.map { AnyCodable($0) })
        case let dictVal as [String: Any]:
            try container.encode(dictVal.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}
