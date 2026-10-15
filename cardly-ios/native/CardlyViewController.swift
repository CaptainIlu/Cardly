import UIKit
import Capacitor

// Registers the Cardly file plugin with Capacitor's bridge.
class CardlyViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(CardlyFilePlugin())
    }
}
