# Web-GL-Series

A collection of code examples for a step-by-step WebGL 2 tutorial series, ranging from a basic full-screen quad (Article 2) up to a real-time fluid simulation (Article 6).

**Article 2: WebGL 2 Basics**:

-   [Medium](https://olha-stefanishyna.medium.com/webgl-2-basics-drawing-a-full-screen-quad-804634c66e63)
-   [Tech Notes](https://ostefani.dev/tech-notes/webgl-drawing-full-screen-quad)
-   [Demo](https://ostefani.github.io/web-gl-series/article-2)

    **Article 3: Rendering to Textures with Framebuffers**

-   [Medium](https://olha-stefanishyna.medium.com/webgl-2-rendering-to-textures-with-framebuffers-40c2b0e53bc8)
-   [Tech Notes](https://ostefani.dev/tech-notes/rendering-to-texture-with-framebuffers)
-   [Demo](https://ostefani.github.io/web-gl-series/article-3)

    **Article 4 Stateful Rendering with the Ping-Pong Technique**

-   [Medium](https://olha-stefanishyna.medium.com/stateful-rendering-with-ping-pong-technique-6c6ef3f5091a)
-   [Tech Notes](https://ostefani.dev/tech-notes/ping-pong-technique)
-   [Demo](https://ostefani.github.io/web-gl-series/article-4)

    **Article 5: Fluid Simulation in WebGL - The Advection Step**

-   [Medium](https://olha-stefanishyna.medium.com/fluid-simulation-in-webgl-the-advection-step-22a35abfd3b2)
-   [Tech Notes](https://ostefani.dev/tech-notes/webgl-fluid-advection)
-   [Article 5 Demo](https://ostefani.github.io/web-gl-series/article-5)

    **Article 6: WebGL Fluid Simulation: Pressure Solving**

-   [Medium](https://olha-stefanishyna.medium.com/webgl-fluid-simulation-interactivity-and-visual-effects-62be2e0de247)
-   [Tech Notes](https://ostefani.dev/tech-notes/webgl-fluid-divergence-pressure)
-   [Demo](https://ostefani.github.io/web-gl-series/article-6)

Each folder contains a self-contained example for its corresponding article.

## Running a Local Server

To load shaders from external files, run a minimal HTTP server. From the project root:

```bash
cd web-gl-series
python3 -m http.server 8000
```

Then open an example in your browser:

```
http://localhost:8000/<article-name>/index.html
```
