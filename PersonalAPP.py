from flask import Flask, render_template_string, request, redirect

app = Flask(__name__)
tasks = []

HTML = """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Mi Planeador Diario</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      max-width: 600px;
      margin: auto;
      padding: 2rem;
    }
    h1 {
      text-align: center;
      color: #333;
    }
    form {
      margin-bottom: 1rem;
      display: flex;
      gap: 10px;
    }
    input[type="text"] {
      flex: 1;
      padding: 0.5rem;
    }
    button {
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      background: white;
      margin-top: 0.5rem;
      padding: 0.7rem;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .done {
      text-decoration: line-through;
      color: gray;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    .actions form {
      margin: 0;
    }
  </style>
</head>
<body>
  <h1>📅 Mi Planeador Diario</h1>

  <form method="POST">
    <input name="task" type="text" placeholder="Escribe tu meta o tarea..." required>
    <button type="submit">Agregar</button>
  </form>

  <ul>
    {% for task in tasks %}
      <li class="{{ 'done' if task.done else '' }}">
        <span>{{ task.text }}</span>
        <div class="actions">
          <form method="POST" action="/toggle">
            <input type="hidden" name="index" value="{{ loop.index0 }}">
            <button>✅</button>
          </form>
          <form method="POST" action="/delete">
            <input type="hidden" name="index" value="{{ loop.index0 }}">
            <button>🗑</button>
          </form>
        </div>
      </li>
    {% endfor %}
  </ul>
</body>
</html>
"""

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        text = request.form.get("task")
        if text:
            tasks.append({"text": text, "done": False})
    return render_template_string(HTML, tasks=tasks)

@app.route("/toggle", methods=["POST"])
def toggle():
    index = int(request.form["index"])
    tasks[index]["done"] = not tasks[index]["done"]
    return redirect("/")

@app.route("/delete", methods=["POST"])
def delete():
    index = int(request.form["index"])
    tasks.pop(index)
    return redirect("/")

if __name__ == "__main__":
    app.run(debug=True)
