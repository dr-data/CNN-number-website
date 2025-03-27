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
    this.ctx.lineWidth = 8;
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
    this.ctx.fillStyle = '#f4f4f4';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Simplified method to get image data
  getImageData(): Uint8ClampedArray | null {
    if (this.points.length === 0) return null;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    return imageData.data;
  }

  // Get a simplified representation of the drawn image
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

    // Return a simplified shape descriptor
    if (strokes === 1 && aspectRatio > 3) return 'horizontal_line';
    if (strokes === 1 && aspectRatio < 0.3) return 'vertical_line';
    if (strokes === 1 && width < 40 && height < 40) return 'dot';
    if (strokes === 2 && Math.abs(aspectRatio - 1) < 0.3) return 'cross';
    if (strokes >= 2 && width > 50 && height > 50) return 'complex';

    return 'unknown';
  }
}

// Simplified neural network simulator
class SimpleNeuralNetworkSimulator {
  // This method simulates what a real neural network would do
  // It's a very crude simulation that recognizes some basic patterns
  predict(canvas: Paint): { predictedClass: number; confidences: number[] } {
    const shape = canvas.getShape();

    // Initialize with equal low confidences
    const baseConfidences = Array(10).fill(0.05);

    // Adjust confidences based on shape
    switch (shape) {
      case 'none':
        // Return random guess with low confidence
        return { predictedClass: Math.floor(Math.random() * 10), confidences: baseConfidences };

      case 'vertical_line': {
        // Likely a 1
        const conf = [...baseConfidences];
        conf[1] = 0.8;
        conf[7] = 0.3;
        return this.finalizeConfidences(conf);
      }

      case 'horizontal_line': {
        // Could be part of several numbers
        const conf = [...baseConfidences];
        conf[0] = 0.2;
        conf[4] = 0.1;
        conf[7] = 0.3;
        conf[9] = 0.1;
        return this.finalizeConfidences(conf);
      }

      case 'dot': {
        // Small isolated mark - could be a 1
        const conf = [...baseConfidences];
        conf[1] = 0.5;
        return this.finalizeConfidences(conf);
      }

      case 'cross': {
        // X shape - similar to 8
        const conf = [...baseConfidences];
        conf[8] = 0.7;
        conf[4] = 0.4;
        return this.finalizeConfidences(conf);
      }

      case 'complex': {
        // More complex shape - make educated guesses based on the drawing
        const conf = [...baseConfidences];

        // Analyze the points to make a better guess
        const points = canvas.points;
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);

        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

        // Check if points form a rough circle around the center
        const distances = points.map(p =>
          Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
        );

        const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const distVariation = distances.reduce((sum, d) => sum + Math.abs(d - avgDistance), 0) / distances.length;

        if (distVariation < 15) {
          // Likely a circle shape (0, 6, 8, 9)
          conf[0] = 0.7;
          conf[6] = 0.3;
          conf[8] = 0.3;
          conf[9] = 0.3;
        } else {
          // Not a circle, try other common number shapes
          const width = Math.max(...xs) - Math.min(...xs);
          const height = Math.max(...ys) - Math.min(...ys);

          if (width > height) {
            // Wide shape (could be 2, 3, 5, 7)
            conf[2] = 0.4;
            conf[3] = 0.4;
            conf[5] = 0.4;
            conf[7] = 0.3;
          } else {
            // Tall shape (could be 1, 4, 7)
            conf[1] = 0.4;
            conf[4] = 0.5;
            conf[7] = 0.4;
          }
        }

        return this.finalizeConfidences(conf);
      }

      default: {
        // Unknown shape, random guess with higher uncertainty
        const conf = [...baseConfidences];
        conf[Math.floor(Math.random() * 10)] = 0.3;
        return this.finalizeConfidences(conf);
      }
    }
  }

  private finalizeConfidences(confidences: number[]): { predictedClass: number; confidences: number[] } {
    // Add some randomness to make it look more like a real neural network
    const confidencesWithRandomness = confidences.map(c => {
      const randomness = Math.random() * 0.2 - 0.1; // -0.1 to +0.1
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
