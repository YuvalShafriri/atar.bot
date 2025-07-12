import React, { useRef, useEffect, useState } from 'react';

type DraggableInfoBoxProps = { content: string };

export const DraggableInfoBox: React.FC<DraggableInfoBoxProps> = ({ content }) => {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
        setIsVisible(!!content);
    }, [content]);

    useEffect(() => {
        const el = boxRef.current;
        if (!el || !isVisible) return;

        // Set box style
        el.style.position = 'absolute';
        el.style.zIndex = '1000';
        el.style.cursor = 'grab';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        
        // Set initial position
        if (!el.style.left && !el.style.top) {
            el.style.left = '20px';
            el.style.top = '20px';
        }

        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        const onMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).id !== 'closeinfo') {
                isDragging = true;
                const htmlEl = el as HTMLElement;
                offsetX = e.clientX - htmlEl.offsetLeft;
                offsetY = e.clientY - htmlEl.offsetTop;
                htmlEl.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                (el as HTMLElement).style.left = `${e.clientX - offsetX}px`;
                (el as HTMLElement).style.top = `${e.clientY - offsetY}px`;
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            (el as HTMLElement).style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mousedown', onMouseDown);
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div id="infoBox" ref={boxRef} dangerouslySetInnerHTML={{ __html: content }} />
    );
};
