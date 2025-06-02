```markdown
# Web-GL-Series

A collection of code examples for a step-by-step WebGL 2 tutorial series, ranging from a basic full-screen quad (Article 2) up to a real-time fluid simulation (Article 6).

## Repository Structure
```

web-gl-series/
├── README.md
├── article-2-basic-quad/
│ ├── index.html
│ └── shaders/
│ ├── basic.vert.glsl
│ └── basic.frag.glsl

````

Each folder contains a self-contained example for its corresponding article.

## Running a Local Server

Browsers typically block `fetch()` calls over `file://`. To load shaders from external files, run a minimal HTTP server. From the project root:

```bash
cd path/to/web-gl-series
python3 -m http.server 8000
````

Then open your browser and navigate to:

```
http://localhost:8000/article-2-basic-quad/index.html
```

or replace `article-2-basic-quad` with any other example folder name.

## Usage

1. **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/web-gl-series.git
    ```

2. **Start the server:**

    ```bash
    cd web-gl-series
    python3 -m http.server 8000
    ```

3. **Open an example in your browser:**

    ```
    http://localhost:8000/article-2-basic-quad/index.html
    ```

    Use the same pattern for `article-3-pingpong`, `article-4-pressure`, etc.

---

Feel free to explore and modify the shaders and JavaScript as you follow along each article in the series.
