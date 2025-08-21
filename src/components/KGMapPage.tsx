import React, { useEffect, useState, useRef } from 'react';

const KGMapPage: React.FC = () => {
  const [html, setHtml] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const base = import.meta.env.BASE_URL ?? '/';
    fetch(base + 'kg-map.html').then(async (r) => {
      if (!r.ok) throw new Error('Failed to load kg-map.html');
      const text = await r.text();
      if (!mounted) return;
      setHtml(text);
    }).catch(e => { console.error(e); setHtml('<div class="p-6 text-red-600">Failed to load KG map.</div>'); });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !html) return;

    // Parse incoming HTML so we can handle scripts and links in order
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1) Inject link and style tags from the head into document.head (avoid duplicates by href)
    const headLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"], style'));
    headLinks.forEach(node => {
      if (node.tagName.toLowerCase() === 'link') {
        const href = (node as HTMLLinkElement).href || (node as HTMLLinkElement).getAttribute('href') || '';
        if (!href) return;
        // avoid injecting duplicates
        const exists = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).some(l => l.getAttribute('href') === href);
        if (exists) return;
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = href;
        document.head.appendChild(newLink);
      } else if (node.tagName.toLowerCase() === 'style') {
        // inject inline styles
        const style = document.createElement('style');
        style.textContent = node.textContent || '';
        document.head.appendChild(style);
      }
    });

    // 2) Extract scripts from the parsed document
    const allScripts = Array.from(doc.querySelectorAll('script'));
    // Remove scripts from the doc body to avoid executing them when we set innerHTML
    allScripts.forEach(s => s.parentNode?.removeChild(s));

    // 3) Inject the body HTML (without scripts)
    containerRef.current.innerHTML = doc.body.innerHTML;

    // Ensure common map containers fill the available height so the map renders 100%
    try {
      const selectors = ['#map', '.map', '.leaflet-container', '[id*=map]', '[class*=map]'];
      // set height on any matching elements
      const matches = containerRef.current.querySelectorAll(selectors.join(','));
      matches.forEach((el) => {
        (el as HTMLElement).style.height = '100%';
        (el as HTMLElement).style.minHeight = '100%';
      });

      // If none found, try to find an element likely to be the map by scanning children
      let mapEl: HTMLElement | null = null;
      for (const sel of selectors) {
        mapEl = containerRef.current.querySelector(sel) as HTMLElement | null;
        if (mapEl) break;
      }
      // If found, walk up ancestors and force full height so layout doesn't collapse
      if (mapEl) {
        let el: HTMLElement | null = mapEl;
        while (el && el !== containerRef.current) {
          el.style.height = '100%';
          el.style.minHeight = '100%';
          el = el.parentElement;
        }
        containerRef.current.style.height = '100%';
        containerRef.current.style.minHeight = '100%';
        if (containerRef.current.firstElementChild && (containerRef.current.firstElementChild as HTMLElement).style) {
          (containerRef.current.firstElementChild as HTMLElement).style.height = '100%';
        }
      }
    } catch (e) {
      console.warn('KGMap: could not force full-height on embedded map elements', e);
    }

    // Helper to load an external script and return a promise that resolves on load or rejects on error
    const loadExternalScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // avoid duplicate script tags with same src
        if (Array.from(document.scripts).some(s => s.getAttribute('src') === src)) {
          // already present; resolve immediately
          return resolve();
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = false; // preserve execution order
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load script: ' + src));
        document.body.appendChild(s);
      });
    };

    // 4) Sequentially load external scripts (in order they appeared)
    (async () => {
      try {
        for (const s of allScripts) {
          const src = s.getAttribute('src');
          if (src) {
            // resolve relative urls against base
            const resolved = new URL(src, window.location.href).href;
            await loadExternalScript(resolved);
          }
        }

        // 5) Execute inline scripts in order
        for (const s of allScripts) {
          const src = s.getAttribute('src');
          if (!src) {
            const inline = document.createElement('script');
            // copy type attribute if present
            if (s.type) inline.type = s.type;
            inline.text = s.textContent || '';
            document.body.appendChild(inline);
            // optionally remove the script node after execution
            // inline.parentNode?.removeChild(inline);
          }
        }
      } catch (e) {
        console.error('Error loading KG map scripts', e);
      }
    })();

  }, [html]);

  return (
    <div id="kg-map-page" className="kg-map-page">
      <div ref={containerRef} />
    </div>
  );
};

export default KGMapPage;
