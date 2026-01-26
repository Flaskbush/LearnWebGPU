import shader from "./shaders/shader.wgsl?raw"
import { TriangleMesh } from "./triangle_mesh"
import { mat4} from "gl-matrix"

export class Renderer {

    canvas: HTMLCanvasElement

    // GPU objects
    adapter: GPUAdapter;
    device: GPUDevice;
    context: GPUCanvasContext;
    format: GPUTextureFormat;

    // Pipeline objects
    uniformBuffer: GPUBuffer;
    bindGroup: GPUBindGroup;
    pipeline: GPURenderPipeline;

    // Meshes / Assets
    triangleMesh: TriangleMesh

    // ???
    t: number = 0.0;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.t = 0.0;
    }

    async Initialize() {
        
        await this.setupDevice();

        this.createAssets();

        await this.makePipeLine();

        this.render();
    }

    async setupDevice() {
        
        this.adapter = <GPUAdapter> await navigator.gpu?.requestAdapter();

        this.device = <GPUDevice> await this.adapter?.requestDevice();

        this.context = <GPUCanvasContext> this.canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();

        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque"
        });
    }

    async makePipeLine() {

        this.uniformBuffer = this.device.createBuffer({
            size: 64 * 3,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {}
                }
            ]
        });

        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer : this.uniformBuffer
                    }
                }
            ]
        });

        const pipeLineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        this.pipeline = this.device.createRenderPipeline({
            vertex : {
                module: this.device.createShaderModule({
                    code: shader
                }),
                entryPoint: "vs_main",
                buffers: [this.triangleMesh.bufferLayout]
            },
            
            fragment: {
                module : this.device.createShaderModule({
                    code : shader
                }),
                entryPoint: "fs_main",
                targets : [{
                    format: this.format
                }]
            },

            primitive: {
                topology: "triangle-list"
            },

            layout: pipeLineLayout
        });

    }

    createAssets() {
        this.triangleMesh = new TriangleMesh(this.device);
    }

    render = () => {

        this.t += 0.01;
        if (this.t > 2.0 * Math.PI) {
            this.t -= 2.0 * Math.PI;
        }

        // make transforms
        const projection = mat4.create();

        mat4.perspective(projection, Math.PI/4, 800/600, 0.1, 10);

        const view = mat4.create();

        mat4.lookAt(view, [-2, 0, 2], [0, 0, 0], [0, 0, 1]);

        const model = mat4.create();

        mat4.rotate(model, model, this.t, [0,0,1]);

        this.device.queue.writeBuffer(this.uniformBuffer, 0, <ArrayBuffer>(<unknown>model));
        this.device.queue.writeBuffer(this.uniformBuffer, 64, <ArrayBuffer>(<unknown>view)); 
        this.device.queue.writeBuffer(this.uniformBuffer, 128, <ArrayBuffer>(<unknown>projection));

        const commandEncoder : GPUCommandEncoder = this.device.createCommandEncoder();

        const textureView : GPUTextureView = this.context.getCurrentTexture().createView();

        const renderpass : GPURenderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: {r: 0.5, g: 0.0, b: 0.25, a: 1.0},
                loadOp: "clear",
                storeOp: "store"
            }]
        });

        renderpass.setPipeline(this.pipeline);
        renderpass.setVertexBuffer(0, this.triangleMesh.buffer);
        renderpass.setBindGroup(0, this.bindGroup);
        renderpass.draw(3, 1, 0, 0);
        renderpass.end();

        this.device.queue.submit([commandEncoder.finish()]);
        
        requestAnimationFrame(this.render);


    }

}
