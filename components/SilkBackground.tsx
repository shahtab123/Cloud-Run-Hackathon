import React, { useRef, useEffect } from 'react';

// Using a lighter red to be more subtle on light background
const STROKE_STYLE = 'rgba(239, 68, 68, 0.2)';

const SilkBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // FIX: Initialize useRef with null to provide an initial value.
    const animationFrameId = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const physics_accuracy = 3;
        const mouse_influence = 20;
        const mouse_cut = 5;
        const gravity = 1200;
        const cloth_height = 30;
        const cloth_width = 50;
        const start_y = 20;
        const spacing = 7;
        const tear_distance = 60;

        let mouse = {
            down: false,
            button: 1,
            x: 0,
            y: 0,
            px: 0,
            py: 0
        };

        class Point {
            x: number;
            y: number;
            px: number;
            py: number;
            pin_x: number | null = null;
            pin_y: number | null = null;
            constraints: { p1: Point; p2: Point; length: number }[] = [];

            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
                this.px = x;
                this.py = y;
            }

            update(delta: number) {
                if (mouse.down) {
                    let diff_x = this.x - mouse.x;
                    let diff_y = this.y - mouse.y;
                    let dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);

                    if (mouse.button === 1) {
                        if (dist < mouse_influence) {
                            this.px = this.x - (mouse.x - mouse.px) * 1.8;
                            this.py = this.y - (mouse.y - mouse.py) * 1.8;
                        }
                    } else if (dist < mouse_cut) {
                        this.constraints = [];
                    }
                }

                let temp_x = this.x;
                let temp_y = this.y;
                const friction = 0.99;
                
                this.x += (this.x - this.px) * friction;
                this.y += (this.y - this.py) * friction + gravity * delta * delta;
                
                this.px = temp_x;
                this.py = temp_y;
            }

            draw() {
                if (!ctx) return;
                for(let i = 0; i < this.constraints.length; i++) {
                    const cons = this.constraints[i];
                    ctx.moveTo(cons.p1.x, cons.p1.y);
                    ctx.lineTo(cons.p2.x, cons.p2.y);
                }
            }

            resolve_constraints() {
                if (this.pin_x != null && this.pin_y != null) {
                    this.x = this.pin_x;
                    this.y = this.pin_y;
                    return;
                }
                
                for(let i=0; i < this.constraints.length; i++) {
                    const constraint = this.constraints[i];
                    
                    let p1 = constraint.p1;
                    let p2 = constraint.p2;

                    let diff_x = p1.x - p2.x;
                    let diff_y = p1.y - p2.y;
                    let dist = Math.sqrt(diff_x * diff_x + diff_y * diff_y);
                    let diff = (constraint.length - dist) / dist;

                    if (dist > tear_distance) {
                        this.constraints.splice(i, 1);
                    }
                    
                    let px = diff_x * diff * 0.5;
                    let py = diff_y * diff * 0.5;

                    p1.x += px;
                    p1.y += py;
                    p2.x -= px;
                    p2.y -= py;
                }

                if (this.x > canvas.width) {
                    this.x = canvas.width;
                    this.px = this.x;
                }
                else if (this.x < 0) {
                    this.x = 0;
                    this.px = this.x;
                }
                
                if (this.y < 0) {
                    this.y = 0;
                    this.py = this.y;
                }
            }

            attach(point: Point) {
                this.constraints.push({
                    p1: this,
                    p2: point,
                    length: spacing
                });
            }

            pin(pinx: number, piny: number) {
                this.pin_x = pinx;
                this.pin_y = piny;
            }
        }
        
        class Cloth {
            points: Point[] = [];

            constructor() {
                const start_x = canvas.width / 2 - cloth_width * spacing / 2;
                for (let y = 0; y <= cloth_height; y++) {
                    for (let x = 0; x <= cloth_width; x++) {
                        let p = new Point(start_x + x * spacing, start_y + y * spacing);
                        y === 0 && p.pin(p.x, p.y);
                        
                        x !== 0 && p.attach(this.points[this.points.length - 1]);
                        y !== 0 && p.attach(this.points[x + (y - 1) * (cloth_width + 1)])
                        
                        this.points.push(p);
                    }
                }
            }

            update(delta: number) {
                let i = physics_accuracy;
                while(i--) {
                    for(const point of this.points) {
                        point.resolve_constraints();
                    }
                }
                for(const point of this.points) {
                    point.update(delta);
                }
            }

            draw() {
                if(!ctx) return;
                ctx.beginPath();
                for(const point of this.points) {
                    point.draw();
                }
                ctx.strokeStyle = STROKE_STYLE;
                ctx.stroke();
            }
        }

        let cloth: Cloth;

        const updateCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            cloth = new Cloth();
        };

        const onMouseMove = (e: MouseEvent) => {
            mouse.px = mouse.x;
            mouse.py = mouse.y;
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const onMouseDown = (e: MouseEvent) => {
            mouse.down = true;
            mouse.button = e.which;
        };

        const onMouseUp = () => {
            mouse.down = false;
        };
        
        const onContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        }

        window.addEventListener('resize', updateCanvasSize);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('contextmenu', onContextMenu);
        
        updateCanvasSize();

        let lastTime: number | null = null;
        
        const animate = (time: number) => {
            if (lastTime === null) lastTime = time;
            let delta = (time - lastTime) / 1000;
            lastTime = time;
            delta = Math.min(delta, 0.05); // cap delta to prevent physics explosion

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cloth.update(delta);
            cloth.draw();
            animationFrameId.current = requestAnimationFrame(animate);
        };
        
        animate(0);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            window.removeEventListener('resize', updateCanvasSize);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('contextmenu', onContextMenu);
        };
    }, []);

    return <canvas ref={canvasRef} id="canvas" style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, width: '100vw', height: '100vh', background: 'transparent' }} />;
};

export default SilkBackground;
