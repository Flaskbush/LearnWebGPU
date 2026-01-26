import { Renderer } from "./renderer.ts";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

const render = new Renderer(canvas);

render.Initialize();