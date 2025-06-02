// Elementos del DOM
const taskList = document.getElementById("taskList");
const completedTaskList = document.getElementById("completedTaskList");
const taskInput = document.getElementById("taskInput");
const addButton = document.getElementById("addButton");
const toggleCompletedBtn = document.getElementById("toggleCompletedBtn");
const completedTasksSection = document.getElementById("completedTasksSection");
const loadingIndicator = document.getElementById("loadingIndicator");

// Lunes (0) a Domingo (6)
const daysOfWeek = ["L", "M", "Mi", "J", "V", "S", "D"];

// Variables para almacenar tareas
let tasks = [];
let completedTasks = [];

// Mostrar indicador de carga
function showLoading() {
  loadingIndicator.style.display = 'flex';
}

// Ocultar indicador de carga
function hideLoading() {
  loadingIndicator.style.display = 'none';
}

// ===== FUNCIONES DE BASE DE DATOS =====

// Inicializar la base de datos
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PlannerDB', 1);
    
    request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("Database initialized successfully");
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Crear almacén para tareas activas
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        taskStore.createIndex('text', 'text', { unique: false });
      }
      
      // Crear almacén para tareas completadas
      if (!db.objectStoreNames.contains('completedTasks')) {
        const completedStore = db.createObjectStore('completedTasks', { keyPath: 'id', autoIncrement: true });
        completedStore.createIndex('text', 'text', { unique: false });
        completedStore.createIndex('completedDate', 'completedDate', { unique: false });
      }
    };
  });
}

// Cargar tareas desde la base de datos
async function loadTasks() {
  showLoading();
  try {
    // Cargar tareas activas
    tasks = await getAll('tasks');
    
    // Cargar tareas completadas
    completedTasks = await getAll('completedTasks');
    
    renderTasks();
  } catch (error) {
    console.error("Error loading tasks:", error);
    alert("Error loading tasks. Please reload the page.");
  } finally {
    hideLoading();
  }
}

// Función auxiliar para obtener todos los registros de un almacén
function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Añadir tarea a la base de datos
function addTaskToDB(task) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');
    const request = store.add(task);
    
    request.onsuccess = () => {
      task.id = request.result; // Actualizar con el ID generado
      resolve(task);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Actualizar tarea en la base de datos
function updateTaskInDB(task) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('tasks', 'readwrite');
    const store = transaction.objectStore('tasks');
    const request = store.put(task);
    
    request.onsuccess = () => resolve(task);
    request.onerror = () => reject(request.error);
  });
}

// Eliminar tarea de la base de datos
function deleteTaskFromDB(id, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Añadir tarea completada a la base de datos
function addCompletedTaskToDB(task) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('completedTasks', 'readwrite');
    const store = transaction.objectStore('completedTasks');
    const request = store.add(task);
    
    request.onsuccess = () => {
      task.id = request.result; // Actualizar con el ID generado
      resolve(task);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// ===== FUNCIONES DE LA INTERFAZ DE USUARIO =====

// Función para verificar si una tarea tiene todos los días marcados
function allDaysChecked(task) {
  return task.days.every(day => day === true);
}

// Función para contar días marcados
function countCheckedDays(task) {
  return task.days.filter(day => day === true).length;
}

// Función para renderizar todas las tareas
function renderTasks() {
  // Renderizar tareas activas
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");

    const row = document.createElement("div");
    row.className = "task-row";

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;
    if (task.completed) {
      span.classList.add("completed");
    }
    span.onclick = () => toggleTaskCompleted(task);

    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";

    const finishBtn = document.createElement("button");
    finishBtn.textContent = "Finish Task";
    finishBtn.className = "finish-task";
    finishBtn.onclick = () => finalizarTareaCompleta(task);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Delete";
    removeBtn.className = "remove";
    removeBtn.onclick = () => removeTask(task);

    const daysDiv = document.createElement("div");
    daysDiv.className = "days";

    // Crear un elemento para mostrar el estado de la tarea
    const statusDiv = document.createElement("div");
    statusDiv.className = "status-indicator";
    
    // Mostrar estado según días completados
    const checkedCount = countCheckedDays(task);
    if (checkedCount > 0) {
      statusDiv.textContent = `Progress: ${checkedCount}/${daysOfWeek.length} days completed`;
    }

    daysOfWeek.forEach((day, dIndex) => {
      const label = document.createElement("label");
      label.className = task.days[dIndex] ? "day-complete" : "";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.days[dIndex];
      checkbox.onchange = async () => {
        showLoading();
        try {
          // Actualizar el checkbox
          task.days[dIndex] = checkbox.checked;
          
          // Aplicar estilo si está marcado
          if (checkbox.checked) {
            label.className = "day-complete";
          } else {
            label.className = "";
          }
          
          // Verificar si todos los días están completos
          if (allDaysChecked(task)) {
            if (confirm("All days are completed! Do you want to finish this task completely?")) {
              await finalizarTareaCompleta(task);
              return;
            }
          }
          
          // Guardar cambios
          await updateTaskInDB(task);
          renderTasks();
        } catch (error) {
          console.error("Error updating day status:", error);
          alert("Error updating task. Please try again.");
        } finally {
          hideLoading();
        }
      };
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + day));
      daysDiv.appendChild(label);
    });

    buttonGroup.appendChild(finishBtn);
    buttonGroup.appendChild(removeBtn);
    row.appendChild(span);
    row.appendChild(buttonGroup);
    li.appendChild(row);
    li.appendChild(daysDiv);
    
    // Añadir indicador de estado solo si hay días marcados
    if (checkedCount > 0) {
      li.appendChild(statusDiv);
    }
    
    taskList.appendChild(li);
  });

  // Renderizar tareas completadas
  completedTaskList.innerHTML = "";
  completedTasks.forEach((task) => {
    const li = document.createElement("li");
    
    const row = document.createElement("div");
    row.className = "task-row";
    
    const span = document.createElement("span");
    span.className = "task-text completed";
    span.textContent = `${task.text} (Completed on ${task.completedDate})`;
    
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Delete";
    removeBtn.className = "remove";
    removeBtn.onclick = () => removeCompletedTask(task);
    
    row.appendChild(span);
    row.appendChild(removeBtn);
    li.appendChild(row);
    completedTaskList.appendChild(li);
  });
}

// Función para añadir una nueva tarea
async function addTask() {
  const text = taskInput.value.trim();
  if (text) {
    showLoading();
    try {
      const newTask = { 
        text: text, 
        days: [false, false, false, false, false, false, false], 
        completed: false 
      };
      
      // Guardar en la base de datos
      const savedTask = await addTaskToDB(newTask);
      
      // Añadir a la lista local
      tasks.push(savedTask);
      
      taskInput.value = "";
      renderTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Error saving task. Please try again.");
    } finally {
      hideLoading();
    }
  }
}

// Función para eliminar una tarea activa
async function removeTask(task) {
  showLoading();
  try {
    await deleteTaskFromDB(task.id, 'tasks');
    tasks = tasks.filter(t => t.id !== task.id);
    renderTasks();
  } catch (error) {
    console.error("Error deleting task:", error);
    alert("Error deleting task. Please try again.");
  } finally {
    hideLoading();
  }
}

// Función para eliminar una tarea completada
async function removeCompletedTask(task) {
  showLoading();
  try {
    await deleteTaskFromDB(task.id, 'completedTasks');
    completedTasks = completedTasks.filter(t => t.id !== task.id);
    renderTasks();
  } catch (error) {
    console.error("Error deleting completed task:", error);
    alert("Error deleting task. Please try again.");
  } finally {
    hideLoading();
  }
}

// Función para marcar/desmarcar una tarea como completada
async function toggleTaskCompleted(task) {
  showLoading();
  try {
    task.completed = !task.completed;
    await updateTaskInDB(task);
    renderTasks();
  } catch (error) {
    console.error("Error updating task:", error);
    alert("Error updating task. Please try again.");
  } finally {
    hideLoading();
  }
}

// Función para obtener el índice del día actual
function getTodayIndex() {
  const today = new Date().getDay(); // Domingo: 0, Lunes: 1, ..., Sábado: 6
  if (today === 0) { // Si es Domingo (JS)
    return 6; // Corresponde al índice 6 (D) en nuestro array daysOfWeek
  }
  return today - 1; // Para Lunes (JS) a Sábado (JS), restamos 1
}

// Función para obtener la fecha actual en formato legible
function getCurrentDateString() {
  const today = new Date();
  return today.toLocaleDateString();
}

// Función para finalizar una tarea específica para el día actual
async function marcarDiaHoy(task) {
  const todayIndex = getTodayIndex();
  
  showLoading();
  try {
    // Marcar el día de hoy como completado
    task.days[todayIndex] = true;
    
    await updateTaskInDB(task);
    renderTasks();
    
    alert(`Task "${task.text}" marked as completed for today!`);
  } catch (error) {
    console.error("Error marking today:", error);
    alert("Error updating task. Please try again.");
  } finally {
    hideLoading();
  }
}

// Función para finalizar completamente una tarea
async function finalizarTareaCompleta(task) {
  showLoading();
  try {
    // Crear tarea completada
    const completedTask = {
      text: task.text,
      completedDate: getCurrentDateString()
    };
    
    // Guardar en la base de datos
    const savedCompletedTask = await addCompletedTaskToDB(completedTask);
    
    // Añadir a la lista local de completadas
    completedTasks.push(savedCompletedTask);
    
    // Eliminar de la base de datos de activas
    await deleteTaskFromDB(task.id, 'tasks');
    
    // Eliminar de la lista local de activas
    tasks = tasks.filter(t => t.id !== task.id);
    
    renderTasks();
    alert(`Task "${task.text}" completed and archived!`);
  } catch (error) {
    console.error("Error completing task:", error);
    alert("Error completing task. Please try again.");
  } finally {
    hideLoading();
  }
}

// Toggle para mostrar/ocultar tareas completadas
toggleCompletedBtn.addEventListener('click', () => {
  if (completedTasksSection.classList.contains('visible')) {
    completedTasksSection.classList.remove('visible');
    toggleCompletedBtn.textContent = "Show completed tasks";
  } else {
    completedTasksSection.classList.add('visible');
    toggleCompletedBtn.textContent = "Hide completed tasks";
  }
});

// Event listeners para añadir tareas
addButton.addEventListener('click', addTask);
taskInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    addTask();
  }
});

// Inicializar la aplicación
async function initApp() {
  try {
    await initDB();
    await loadTasks();
  } catch (error) {
    console.error("Error initializing application:", error);
    alert("Error loading application. Please reload the page.");
  }
}

// Iniciar la aplicación cuando se carga la página
initApp();