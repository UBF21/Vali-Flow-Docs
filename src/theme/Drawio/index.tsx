import BrowserOnly from '@docusaurus/BrowserOnly';
import React, { useEffect, useRef } from 'react';

interface DrawioProps {
  content: string;
  maxHeight?: number;
  autoFit?: boolean;
  autoCrop?: boolean;
  autoOrigin?: boolean;
  allowZoomOut?: boolean;
  allowZoomIn?: boolean;
  checkVisibleState?: boolean;
  toolbarPosition?: string;
  toolbarNohide?: boolean;
  toolbarButtons?: string;
  [key: string]: unknown;
}

function DrawioInner({
  content,
  maxHeight,
  autoFit = true,
  autoCrop,
  autoOrigin,
  allowZoomOut,
  allowZoomIn,
  checkVisibleState,
  toolbarPosition,
  toolbarNohide,
  toolbarButtons,
  ...rest
}: DrawioProps) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GraphViewer = (window as any).GraphViewer;

    if (!GraphViewer) return;
    if (!content) return;

    const data = {
      editable: '_blank',
      highlight: '#0000ff',
      nav: true,
      resize: true,
      toolbar: 'zoom lightbox',
      xml: content,
      'max-height': maxHeight,
      'auto-fit': autoFit,
      'auto-crop': autoCrop,
      'auto-origin': autoOrigin,
      'allow-zoom-out': allowZoomOut,
      'allow-zoom-in': allowZoomIn,
      'check-visible-state': checkVisibleState,
      'toolbar-position': toolbarPosition,
      'toolbar-nohide': toolbarNohide,
      'toolbar-buttons': toolbarButtons,
      ...rest,
    };

    el.current!.dataset.mxgraph = JSON.stringify(data);

    setTimeout(() => {
      GraphViewer.createViewerForElement(el.current);
      // Force mxGraph to re-render after initialization
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
    }, 0);
  }, []);

  return (
    <div className="docusaurus-plugin-drawio">
      <div className="docusaurus-plugin-drawio__content" ref={el} />
    </div>
  );
}

export default React.memo(function Drawio(props: DrawioProps) {
  return (
    <BrowserOnly fallback={<>loading...</>}>
      {() => <DrawioInner {...props} />}
    </BrowserOnly>
  );
});
