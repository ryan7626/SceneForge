"use client";

import { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Re-initialize nodes on resize to spread them out proportionally
      const nodeCount = Math.floor((canvas.width * canvas.height) / 10000); 
      nodesRef.current = Array.from({ length: nodeCount }).map(() => {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        return {
          x,
          y,
          originX: x,
          originY: y,
          vx: 0,
          vy: 0,
        };
      });
    };

    window.addEventListener("resize", resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useAnimationFrame(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const nodes = nodesRef.current;
    const mouse = mouseRef.current;

    // Update nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // 1. Mouse Attraction
      const dxMouse = mouse.x - node.x;
      const dyMouse = mouse.y - node.y;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      
      if (distMouse < 250) {
        const force = (250 - distMouse) / 250;
        node.vx += (dxMouse / distMouse) * force * 0.15;
        node.vy += (dyMouse / distMouse) * force * 0.15;
      }

      // 2. Restorative force (Return to origin)
      const dxOrigin = node.originX - node.x;
      const dyOrigin = node.originY - node.y;
      const distOrigin = Math.sqrt(dxOrigin * dxOrigin + dyOrigin * dyOrigin);
      
      // Very gentle spring force back to origin
      if (distOrigin > 0.1) {
        node.vx += dxOrigin * 0.002;
        node.vy += dyOrigin * 0.002;
      }

      // 3. Negative acceleration (Damping/Friction)
      // This makes the transition smooth and prevents jitter
      node.vx *= 0.94;
      node.vy *= 0.94;
      
      // 4. Subtle floating motion (Optional noise to feel alive)
      node.vx += (Math.random() - 0.5) * 0.01;
      node.vy += (Math.random() - 0.5) * 0.01;

      // Update position
      node.x += node.vx;
      node.y += node.vy;
    }


    // Draw lines
    ctx.lineWidth = 0.5;
    for (let i = 0; i < nodes.length; i++) {
        const dxMouse = mouse.x - nodes[i].x;
        const dyMouse = mouse.y - nodes[i].y;
        const distMouseSq = dxMouse * dxMouse + dyMouse * dyMouse;
        
        // Draw connection to mouse
        if (distMouseSq < 40000) {
            const alpha = 1 - distMouseSq / 40000;
            ctx.strokeStyle = `rgba(17, 17, 17, ${alpha * 0.15})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
        }

      // Draw connections to other nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = dx * dx + dy * dy;

        if (dist < 12000) {
          const alpha = 1 - dist / 12000;
          ctx.strokeStyle = `rgba(17, 17, 17, ${alpha * 0.15})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    ctx.fillStyle = "rgba(17, 17, 17, 0.4)";
    for (let i = 0; i < nodes.length; i++) {
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
  });


  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1]"
    />
  );
}

