interface DrawPoint {
  x: number;
  y: number;
  dragging: boolean;
}

class Paint {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDrawing = false;
  lastPoint: DrawPoint | null = null;
  points: DrawPoint[] = [];
  clearTimeout: number | null = null;
  onChange: (() => void) | null = null;

  constructor(canvasId: string, onChange: (() => void) | null = null) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with ID ${canvasId} not found`);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.onChange = onChange;

    // Setup canvas size
    this.canvas.width = 150;
    this.canvas.height = 150;
    this.clear();

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.startDrawingAtPoint(x, y);
  }

  handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (!this.isDrawing) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.drawAtPoint(x, y);
  }

  handleTouchEnd(e: TouchEvent) {
    e.preventDefault();
    this.stopDrawing();
  }

  startDrawing(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.startDrawingAtPoint(x, y);
  }

  startDrawingAtPoint(x: number, y: number) {
    this.isDrawing = true;
    this.lastPoint = { x, y, dragging: false };
    this.points.push(this.lastPoint);
    this.redraw();

    if (this.clearTimeout) {
      window.clearTimeout(this.clearTimeout);
      this.clearTimeout = null;
    }
  }

  draw(e: MouseEvent) {
    if (!this.isDrawing) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.drawAtPoint(x, y);
  }

  drawAtPoint(x: number, y: number) {
    this.lastPoint = { x, y, dragging: true };
    this.points.push(this.lastPoint);
    this.redraw();
  }

  stopDrawing() {
    this.isDrawing = false;
    this.lastPoint = null;

    if (this.onChange) {
      this.onChange();
    }

    // Auto-clear after a timeout if configured
    this.clearTimeout = window.setTimeout(() => {
      this.clear();
    }, 2200);
  }

  redraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.lineWidth = 10; // Increased line width for better visibility
    this.ctx.strokeStyle = '#000';

    for (let i = 0; i < this.points.length; i++) {
      this.ctx.beginPath();

      if (this.points[i].dragging && i > 0) {
        this.ctx.moveTo(this.points[i - 1].x, this.points[i - 1].y);
      } else {
        this.ctx.moveTo(this.points[i].x - 1, this.points[i].y);
      }

      this.ctx.lineTo(this.points[i].x, this.points[i].y);
      this.ctx.closePath();
      this.ctx.stroke();
    }
  }

  clear() {
    this.points = [];
    this.ctx.fillStyle = '#ffffff'; // Pure white background for better contrast
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Simplified method to get image data
  getImageData(): Uint8ClampedArray | null {
    if (this.points.length === 0) return null;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    return imageData.data;
  }

  // Enhanced shape analysis
  getShape(): string {
    // No points means nothing drawn
    if (this.points.length === 0) return 'none';

    // Calculate some simple features of the drawing
    const xs = this.points.map(p => p.x);
    const ys = this.points.map(p => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / height;

    // Calculate number of strokes (approximate)
    const strokes = this.points.reduce((count, point, i) => {
      if (i === 0 || !point.dragging) return count + 1;
      return count;
    }, 0);

    // Calculate closed-ness (are the start and end points close?)
    const startPoint = this.points[0];
    const endPoint = this.points[this.points.length - 1];
    const distance = Math.sqrt(
      Math.pow(startPoint.x - endPoint.x, 2) + Math.pow(startPoint.y - endPoint.y, 2)
    );
    const isClosed = distance < 30;

    // Calculate center of mass
    const centerX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
    const centerY = ys.reduce((sum, y) => sum + y, 0) / ys.length;

    // Return an enhanced shape descriptor
    if (strokes === 1 && aspectRatio > 3) return 'horizontal_line';
    if (strokes === 1 && aspectRatio < 0.3) return 'vertical_line';
    if (strokes === 1 && width < 40 && height < 40) return 'dot';
    if (strokes === 2 && Math.abs(aspectRatio - 1) < 0.3) return 'cross';
    if (isClosed && Math.abs(aspectRatio - 1) < 0.3) return 'circle';
    if (isClosed && aspectRatio > 1.5) return 'ellipse';
    if (this.points.length > 100 && width > 50 && height > 50) return 'complex';
    if (this.isZigzag(xs, ys)) return 'zigzag';
    
    // Check for arc shapes (like 2, 3)
    if (this.hasArcs()) return 'curved';

    return 'unknown';
  }

  // Helper method to detect zigzag patterns (e.g., for 7, Z)
  isZigzag(xs: number[], ys: number[]): boolean {
    if (this.points.length < 20) return false;
    
    // Calculate direction changes
    let directionChanges = 0;
    let prevDirection = 0;
    
    for (let i = 2; i < xs.length; i++) {
      const dx1 = xs[i-1] - xs[i-2];
      const dx2 = xs[i] - xs[i-1];
      
      if ((dx1 * dx2 < 0) && Math.abs(dx1) > 5 && Math.abs(dx2) > 5) {
        directionChanges++;
      }
    }
    
    return directionChanges >= 2;
  }
  
  // Helper method to detect curved shapes
  hasArcs(): boolean {
    if (this.points.length < 15) return false;
    
    let totalAngleChange = 0;
    for (let i = 2; i < this.points.length; i++) {
      const p1 = this.points[i-2];
      const p2 = this.points[i-1];
      const p3 = this.points[i];
      
      if (p1.dragging && p2.dragging && p3.dragging) {
        const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        totalAngleChange += Math.abs(angle2 - angle1);
      }
    }
    
    return totalAngleChange > Math.PI * 1.5;
  }
}

// Enhanced neural network simulator
class SimpleNeuralNetworkSimulator {
  // This method simulates what a real neural network would do
  // With improved pattern recognition
  predict(canvas: Paint): { predictedClass: number; confidences: number[] } {
    const shape = canvas.getShape();
    const points = canvas.points;

    // Initialize with equal low confidences
    const baseConfidences = Array(10).fill(0.05);
    
    // If no drawing, return random guess
    if (shape === 'none') {
      return { predictedClass: Math.floor(Math.random() * 10), confidences: baseConfidences };
    }
    
    // Get drawing characteristics
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / height;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Calculate center point density vs edge density
    const centerRegion = {
      minX: centerX - width * 0.25,
      maxX: centerX + width * 0.25,
      minY: centerY - height * 0.25,
      maxY: centerY + height * 0.25
    };
    
    let centerPoints = 0;
    let totalPoints = points.length;
    
    for (const p of points) {
      if (p.x >= centerRegion.minX && p.x <= centerRegion.maxX && 
          p.y >= centerRegion.minY && p.y <= centerRegion.maxY) {
        centerPoints++;
      }
    }
    
    const centerDensity = centerPoints / totalPoints;
    
    // Calculate number of strokes
    const strokes = points.reduce((count, point, i) => {
      if (i === 0 || !point.dragging) return count + 1;
      return count;
    }, 0);

    // Check if drawing has a loop
    const hasLoop = this.hasLoop(points);
    
    // Now build confidence scores based on shape characteristics
    const conf = [...baseConfidences];
    
    switch (shape) {
      case 'vertical_line': {
        // Highly likely a 1
        conf[1] = 0.9;
        conf[7] = 0.2;
        break;
      }
      
      case 'horizontal_line': {
        // Most likely part of a 7 or minus sign
        conf[7] = 0.5;
        conf[0] = 0.1;
        conf[4] = 0.1;
        break;
      }
      
      case 'dot': {
        // Small isolated mark - likely 1
        conf[1] = 0.6;
        break;
      }
      
      case 'cross': {
        // X shape - similar to 8 or 4
        conf[8] = 0.6;
        conf[4] = 0.5;
        conf[7] = 0.2;
        break;
      }
      
      case 'circle': {
        // Circle - strong signal for 0
        conf[0] = 0.85;
        conf[6] = 0.4;
        conf[8] = 0.3;
        conf[9] = 0.3;
        break;
      }
      
      case 'zigzag': {
        // Zigzag pattern - likely 2, 3, 7, or 5
        conf[2] = 0.5;
        conf[3] = 0.4;
        conf[7] = 0.6;
        conf[5] = 0.3;
        break;
      }
      
      case 'curved': {
        // Curved shape - could be 2, 3, 5, 8, 9
        conf[2] = 0.5;
        conf[3] = 0.6;
        conf[5] = 0.5;
        conf[8] = 0.4;
        conf[9] = 0.4;
        break;
      }
      
      case 'complex': {
        // For complex shapes, use additional analysis
        
        // Open loops like 6, 9
        if (hasLoop && centerDensity < 0.3) {
          conf[6] = 0.7;
          conf[9] = 0.7;
          conf[8] = 0.4;
        }
        // Closed loops like 8, 0
        else if (hasLoop && centerDensity > 0.3) {
          conf[8] = 0.7;
          conf[0] = 0.6;
        }
        // Angular shapes like 4, 7
        else if (strokes >= 2 && !hasLoop) {
          conf[4] = 0.7;
          conf[7] = 0.6;
          conf[2] = 0.4;
        }
        // Curved with straight elements like 2, 3, 5
        else {
          conf[2] = 0.5;
          conf[3] = 0.6;
          conf[5] = 0.6;
        }
        
        // Further analyze based on quadrants with points
        const quadrants = this.analyzeQuadrants(points, centerX, centerY);
        
        // Adjust probabilities based on quadrant analysis
        if (quadrants.topLeft && quadrants.topRight && !quadrants.bottomLeft && quadrants.bottomRight) {
          conf[2] += 0.2; // 2 typically has this pattern
        }
        if (quadrants.topLeft && quadrants.topRight && quadrants.bottomLeft && !quadrants.bottomRight) {
          conf[5] += 0.2; // 5 often has this pattern
        }
        if (!quadrants.topLeft && quadrants.topRight && quadrants.bottomLeft && quadrants.bottomRight) {
          conf[3] += 0.2; // 3 often has this pattern
        }
        
        break;
      }
      
      default: {
        // For unknown shapes, use some randomness with bias toward common numbers
        conf[Math.floor(Math.random() * 10)] = 0.3;
        break;
      }
    }
    
    return this.finalizeConfidences(conf);
  }
  
  // Helper to check if drawing contains a loop
  private hasLoop(points: DrawPoint[]): boolean {
    if (points.length < 20) return false;
    
    // Check if start and end points are close
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    const distance = Math.sqrt(
      Math.pow(startPoint.x - endPoint.x, 2) + 
      Math.pow(startPoint.y - endPoint.y, 2)
    );
    
    return distance < 30;
  }
  
  // Helper to analyze which quadrants contain points
  private analyzeQuadrants(points: DrawPoint[], centerX: number, centerY: number): Record<string, boolean> {
    let topLeft = false;
    let topRight = false;
    let bottomLeft = false;
    let bottomRight = false;
    
    for (const p of points) {
      if (p.x < centerX && p.y < centerY) topLeft = true;
      if (p.x >= centerX && p.y < centerY) topRight = true;
      if (p.x < centerX && p.y >= centerY) bottomLeft = true;
      if (p.x >= centerX && p.y >= centerY) bottomRight = true;
    }
    
    return { topLeft, topRight, bottomLeft, bottomRight };
  }

  private finalizeConfidences(confidences: number[]): { predictedClass: number; confidences: number[] } {
    // Add some randomness to make it look more like a real neural network
    const confidencesWithRandomness = confidences.map(c => {
      const randomness = Math.random() * 0.15 - 0.075; // -0.075 to +0.075 (reduced randomness)
      return Math.max(0, Math.min(1, c + randomness));
    });

    // Normalize to make sure it sums to 1
    const sum = confidencesWithRandomness.reduce((a, b) => a + b, 0);
    const normalizedConfidences = confidencesWithRandomness.map(c => c / sum);

    // Return the most likely class and all confidences
    const predictedClass = normalizedConfidences.indexOf(Math.max(...normalizedConfidences));
    return { predictedClass, confidences: normalizedConfidences };
  }
}

// Main application
class App {
  neuralNetwork: SimpleNeuralNetworkSimulator;
  canvases: Record<string, Paint> = {};

  constructor() {
    this.neuralNetwork = new SimpleNeuralNetworkSimulator();

    // Initialize canvases
    this.setupCanvas('drawing-canvas', 'result');
    this.setupCanvas('normalized-canvas', 'normalized-result');
    this.setupCanvas('bars-canvas', 'bars-result', true);
  }

  setupCanvas(canvasId: string, resultId: string, showBars = false) {
    this.canvases[canvasId] = new Paint(canvasId, () => {
      this.processDrawing(canvasId, resultId, showBars);
    });
  }

  processDrawing(canvasId: string, resultId: string, showBars = false) {
    const canvas = this.canvases[canvasId];
    const resultElement = document.getElementById(resultId);

    if (!resultElement) {
      console.error(`Result element with ID ${resultId} not found`);
      return;
    }

    try {
      const { predictedClass, confidences } = this.neuralNetwork.predict(canvas);

      // Update result display
      resultElement.textContent = predictedClass.toString();

      // Update bars if needed
      if (showBars) {
        for (let i = 0; i < 10; i++) {
          const barElement = document.getElementById(`bar-${i}`);
          if (barElement) {
            const confidence = confidences[i] * 100;
            barElement.style.width = `${confidence}%`;
          }
        }
      }
    } catch (error) {
      console.error('Error during prediction:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App(); // Create app instance without storing it
});
