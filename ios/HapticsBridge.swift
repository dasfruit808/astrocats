import UIKit
import WebKit

/// Bridges WebKit messages from the web runtime to native haptics.
final class HapticsBridge: NSObject, WKScriptMessageHandler {
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)

    override init() {
        super.init()
        mediumImpact.prepare()
        lightImpact.prepare()
    }

    func attach(to webView: WKWebView) {
        webView.configuration.userContentController.add(self, name: "haptics")
    }

    func detach(from webView: WKWebView) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "haptics")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "haptics" else { return }

        if let body = message.body as? [String: Any], let event = body["event"] as? String {
            triggerHaptic(for: event)
        } else if let event = message.body as? String {
            triggerHaptic(for: event)
        }
    }

    private func triggerHaptic(for event: String) {
        switch event {
        case "fireButton":
            mediumImpact.impactOccurred()
            mediumImpact.prepare()
        case "joystick":
            lightImpact.impactOccurred()
            lightImpact.prepare()
        default:
            break
        }
    }
}
