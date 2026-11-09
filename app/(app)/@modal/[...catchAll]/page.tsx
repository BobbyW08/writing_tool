// Step U5: a soft (client-side) navigation to any route other than the intercepted
// (.)view/[collection]/[code] stays matched to that popup until something explicitly unmatches
// it -- Next's documented fix is a catch-all under the slot that renders nothing. Covers the
// modal's own "Open full page" link, and any other in-app navigation while the popup is open.
export default function ModalCatchAll() {
  return null;
}
