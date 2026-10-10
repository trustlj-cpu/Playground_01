import UIKit
import WebKit
import Capacitor

// 웹사이트를 그대로 띄우는 Capacitor 화면에, 눈에 보이지 않는 앱 기능만 덧붙인다.
// - 웹 화면은 사파리처럼 안전 영역(상태표시줄·노치·다이내믹 아일랜드·가로 화면 가장자리) 안쪽에서 시작
// - 상태표시줄 뒤는 지면 종이색(어두운 모드는 어두운 지면색)
// - dd-splash.js: 앱을 켤 때 한 번 시작 모션(문서 시작 시점 주입이라 웹 화면보다 먼저 덮개가 깔림, 웹 요소는 건드리지 않음)
// - dd-app.js: 외부 링크 인앱 브라우저, 딥링크, 푸시 등록
// - 당겨서 새로고침
class MainViewController: CAPBridgeViewController {
    private static let paper = UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0x14 / 255, green: 0x13 / 255, blue: 0x0f / 255, alpha: 1)
            : UIColor(red: 0xec / 255, green: 0xe4 / 255, blue: 0xd8 / 255, alpha: 1)
    }

    // capacitorDidLoad 는 loadView 안에서 불린다: 여기서 종이색 바탕 화면을 만들고 웹 화면을 안전 영역에 맞춰 붙인다
    override func capacitorDidLoad() {
        guard let webView = webView else { return }
        let container = UIView()
        container.backgroundColor = Self.paper
        webView.isOpaque = false
        webView.backgroundColor = Self.paper
        webView.scrollView.backgroundColor = Self.paper
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(webView)
        let guide = container.safeAreaLayoutGuide
        // 사파리와 같은 화면 영역: 위·좌·우는 안전 영역 안쪽, 아래는 홈 표시줄까지
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: guide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        view = container
        injectScripts(into: webView.configuration.userContentController)
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(reloadPage(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh
    }

    // Capacitor 는 webViewConfiguration 이 만든 스크립트 목록을 자기 목록(WebViewDelegationHandler.contentController)으로
    // 바꿔 끼우므로, 웹뷰가 만들어진 뒤 실제로 쓰이는 목록에 넣는다. 첫 페이지 로드(viewDidLoad)보다 먼저 불린다.
    private func injectScripts(into controller: WKUserContentController) {
        let scripts: [(String, WKUserScriptInjectionTime)] = [("dd-splash", .atDocumentStart), ("dd-app", .atDocumentEnd)]
        for (name, time) in scripts {
            guard let url = Bundle.main.url(forResource: name, withExtension: "js", subdirectory: "public"),
                  let source = try? String(contentsOf: url, encoding: .utf8) else { continue }
            controller.addUserScript(WKUserScript(source: source, injectionTime: time, forMainFrameOnly: true))
        }
    }

    @objc private func reloadPage(_ sender: UIRefreshControl) {
        webView?.reload()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { sender.endRefreshing() }
    }
}
