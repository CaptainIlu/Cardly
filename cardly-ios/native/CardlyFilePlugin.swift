import Foundation
import UIKit
import Capacitor
import UniformTypeIdentifiers

// Lets Cardly open ONE json file from Files / iCloud Drive, remember it, and
// then read and write it directly (so laptop and iPhone share the same file).
@objc(CardlyFilePlugin)
public class CardlyFilePlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate {
    public let identifier = "CardlyFilePlugin"
    public let jsName = "CardlyFile"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pick", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "forget", returnType: CAPPluginReturnPromise)
    ]

    private let bookmarkKey = "cardlyFileBookmark"
    private var pendingPick: CAPPluginCall?

    // MARK: pick

    @objc func pick(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [UTType.json], asCopy: false)
            picker.delegate = self
            picker.allowsMultipleSelection = false
            self.pendingPick = call
            self.bridge?.saveCall(call)
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = pendingPick else { return }
        pendingPick = nil
        guard let url = urls.first else { call.reject("No file chosen"); return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let data = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
            UserDefaults.standard.set(data, forKey: bookmarkKey)
            call.resolve(["name": url.lastPathComponent])
        } catch {
            call.reject("Could not remember that file: \(error.localizedDescription)")
        }
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingPick?.reject("cancelled")
        pendingPick = nil
    }

    // MARK: hasFile / forget

    @objc func hasFile(_ call: CAPPluginCall) {
        call.resolve(["has": UserDefaults.standard.data(forKey: bookmarkKey) != nil])
    }

    @objc func forget(_ call: CAPPluginCall) {
        UserDefaults.standard.removeObject(forKey: bookmarkKey)
        call.resolve()
    }

    // MARK: read / write

    private func resolveURL() throws -> URL {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else {
            throw NSError(domain: "Cardly", code: 1, userInfo: [NSLocalizedDescriptionKey: "No data file chosen yet."])
        }
        var stale = false
        let url = try URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
        if stale {
            let scoped = url.startAccessingSecurityScopedResource()
            if let fresh = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil) {
                UserDefaults.standard.set(fresh, forKey: bookmarkKey)
            }
            if scoped { url.stopAccessingSecurityScopedResource() }
        }
        return url
    }

    @objc func read(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let url = try self.resolveURL()
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }
                try? FileManager.default.startDownloadingUbiquitousItem(at: url)

                var coordError: NSError?
                var text: String?
                var readError: Error?
                NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordError) { readURL in
                    do {
                        let data = try Data(contentsOf: readURL)
                        text = String(decoding: data, as: UTF8.self)
                    } catch {
                        readError = error
                    }
                }
                if let e = coordError { throw e }
                if let e = readError { throw e }
                guard let result = text else {
                    throw NSError(domain: "Cardly", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not read the file."])
                }
                let modified = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
                call.resolve([
                    "text": result,
                    "modified": Int((modified?.timeIntervalSince1970 ?? 0) * 1000)
                ])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let text = call.getString("text") else { call.reject("Missing text"); return }
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let url = try self.resolveURL()
                let scoped = url.startAccessingSecurityScopedResource()
                defer { if scoped { url.stopAccessingSecurityScopedResource() } }

                var coordError: NSError?
                var writeError: Error?
                NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing, error: &coordError) { writeURL in
                    do {
                        try Data(text.utf8).write(to: writeURL)
                    } catch {
                        writeError = error
                    }
                }
                if let e = coordError { throw e }
                if let e = writeError { throw e }
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}
