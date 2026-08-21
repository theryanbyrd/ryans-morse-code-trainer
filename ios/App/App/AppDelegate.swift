import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureAudioSession()
        observeAudioInterruptions()
        return true
    }

    /// Ditdah IS audio, so the ring/silent switch must not mute it.
    ///
    /// WKWebView audio defaults to a session category the hardware mute switch
    /// silences. For a video player that is correct; for a Morse trainer it
    /// means the app looks broken to anyone who keeps their phone on silent.
    /// `.playback` opts out of the mute switch.
    ///
    /// `.mixWithOthers` is deliberately NOT set: Morse timing is the lesson, and
    /// letting a podcast play underneath it would make copying harder, not
    /// easier. Ditdah takes the session while it is in front.
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            // Non-fatal: audio still plays, it just obeys the mute switch.
            NSLog("[Ditdah] AVAudioSession setup failed: \(error.localizedDescription)")
        }
    }

    /// A phone call or alarm can deactivate the session underneath us.
    ///
    /// playMorse schedules an entire message onto the Web Audio timeline up
    /// front, so an interruption that is not handled leaves the learner with
    /// silence and a UI that thinks it is still playing. Reactivating on
    /// `.ended` and telling the webview lets it reset cleanly.
    private func observeAudioInterruptions() {
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance(),
            queue: .main
        ) { note in
            guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }

            switch type {
            case .began:
                NotificationCenter.default.post(name: .ditdahAudioInterrupted, object: nil)
            case .ended:
                try? AVAudioSession.sharedInstance().setActive(true)
                NotificationCenter.default.post(name: .ditdahAudioResumed, object: nil)
            @unknown default:
                break
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

extension Notification.Name {
    static let ditdahAudioInterrupted = Notification.Name("DitdahAudioInterrupted")
    static let ditdahAudioResumed = Notification.Name("DitdahAudioResumed")
}
