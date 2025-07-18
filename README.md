# Web-GL-Series

A collection of code examples for a step-by-step WebGL 2 tutorial series, ranging from a basic full-screen quad (Article 2) up to a real-time fluid simulation (Article 6).

-   [Article 2 Demo](https://ostefani.github.io/web-gl-series/article-2)
-   [Article 3 Demo](https://ostefani.github.io/web-gl-series/article-3)
-   [Article 4 Demo](https://ostefani.github.io/web-gl-series/article-4)

Each folder contains a self-contained example for its corresponding article.

## Running a Local Server

Browsers typically block `fetch()` calls over `file://`. To load shaders from external files, run a minimal HTTP server. From the project root:

```bash
cd web-gl-series
python3 -m http.server 8000
```

Then open an example in your browser:

```
http://localhost:8000/<article-name>/index.html
```
