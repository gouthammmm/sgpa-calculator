"use strict";

const STORAGE_KEY = "gradepath.semesters.v1";
const courseList = document.querySelector("#course-list");
const form = document.querySelector("#semester-form");
const gradeScale = document.querySelector("#grade-scale");
const formMessage = document.querySelector("#form-message");
const saveButton = document.querySelector("#save-semester");
const historyList = document.querySelector("#semester-list");
let history = [];
let latestResult = null;

function currentScale() {
  return Number(gradeScale.value);
}

function formatPoints(value) {
  return Number(value).toFixed(2);
}

function createCourseRow(course = {}) {
  const row = document.createElement("tr");
  row.className = "course-row";

  const nameCell = document.createElement("td");
  const name = document.createElement("input");
  name.className = "course-name";
  name.type = "text";
  name.maxLength = 50;
  name.placeholder = "e.g. Data structures";
  name.setAttribute("aria-label", "Course name");
  name.value = course.name || "";
  nameCell.append(name);

  const creditsCell = document.createElement("td");
  const credits = document.createElement("input");
  credits.className = "course-credits";
  credits.type = "number";
  credits.min = "0.5";
  credits.max = "60";
  credits.step = "0.5";
  credits.placeholder = "3";
  credits.inputMode = "decimal";
  credits.setAttribute("aria-label", "Course credits");
  credits.value = course.credits ?? "";
  creditsCell.append(credits);

  const pointsCell = document.createElement("td");
  const points = document.createElement("input");
  points.className = "course-points";
  points.type = "number";
  points.min = "0";
  points.max = String(currentScale());
  points.step = "0.01";
  points.placeholder = String(currentScale());
  points.inputMode = "decimal";
  points.setAttribute("aria-label", `Grade points, from 0 to ${currentScale()}`);
  points.value = course.gradePoints ?? "";
  pointsCell.append(points);

  const actionCell = document.createElement("td");
  actionCell.className = "remove-cell";
  const remove = document.createElement("button");
  remove.className = "remove-course";
  remove.type = "button";
  remove.setAttribute("aria-label", "Remove this course");
  remove.title = "Remove course";
  remove.textContent = "×";
  actionCell.append(remove);

  row.append(nameCell, creditsCell, pointsCell, actionCell);
  return row;
}

function addCourse(course) {
  courseList.append(createCourseRow(course));
  courseList.lastElementChild.querySelector(".course-name").focus();
}

function updateGradePointInputs() {
  for (const input of courseList.querySelectorAll(".course-points")) {
    input.max = String(currentScale());
    input.setAttribute("aria-label", `Grade points, from 0 to ${currentScale()}`);
    input.placeholder = String(currentScale());
  }
  document.querySelectorAll(".result-value span").forEach((element) => {
    element.textContent = ` / ${formatPoints(currentScale())}`;
  });
  if (history.length === 0) renderHistory();
}

function readCourses() {
  return Array.from(courseList.querySelectorAll(".course-row"), (row) => ({
    name: row.querySelector(".course-name").value,
    credits: row.querySelector(".course-credits").value,
    gradePoints: row.querySelector(".course-points").value,
  }));
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.classList.remove("is-error", "is-success");
}

function markResultStale() {
  latestResult = null;
  saveButton.disabled = true;
  document.querySelector("#semester-result").classList.remove("has-result");
  document.querySelector("#sgpa-value").innerHTML = `—<span> / ${formatPoints(currentScale())}</span>`;
  document.querySelector("#total-credits").textContent = "—";
  document.querySelector("#quality-points").textContent = "—";
  clearMessage();
}

function setMessage(message, kind = "error") {
  formMessage.textContent = message;
  formMessage.classList.toggle("is-error", kind === "error");
  formMessage.classList.toggle("is-success", kind === "success");
}

function calculateCurrentSemester() {
  clearMessage();
  try {
    latestResult = GPACore.calculateSemester(readCourses(), currentScale());
    document.querySelector("#sgpa-value").innerHTML = `${formatPoints(latestResult.sgpa)}<span> / ${formatPoints(currentScale())}</span>`;
    document.querySelector("#total-credits").textContent = formatPoints(latestResult.totalCredits).replace(/\.00$/, "");
    document.querySelector("#quality-points").textContent = formatPoints(latestResult.qualityPoints);
    document.querySelector("#semester-result").classList.add("has-result");
    saveButton.disabled = false;
    setMessage(`Calculated from ${latestResult.courses.length} courses, weighted by credits.`, "success");
    return latestResult;
  } catch (error) {
    latestResult = null;
    saveButton.disabled = true;
    setMessage(error.message);
    return null;
  }
}

function readHistory() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error("Saved data is not a list.");
    return parsed;
  } catch (error) {
    setMessage("Could not read saved semesters in this browser. You can still calculate an SGPA.");
    return [];
  }
}

function writeHistory() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    setMessage("This browser could not save your semester. Check local storage settings or export a copy.");
    return false;
  }
}

function setCgpaDisplay(result) {
  document.querySelector("#cgpa-value").innerHTML = `${formatPoints(result.cgpa)}<span> / ${formatPoints(currentScale())}</span>`;
  document.querySelector("#cgpa-caption").textContent = `${formatPoints(result.totalCredits).replace(/\.00$/, "")} attempted credits across ${history.length} saved ${history.length === 1 ? "semester" : "semesters"}`;
  document.querySelector("#cgpa-ring-text").textContent = formatPoints(result.cgpa);
  const percent = Math.min(100, Math.max(0, (result.cgpa / currentScale()) * 100));
  document.querySelector("#cgpa-ring").style.setProperty("--ring-progress", `${percent}%`);
  document.querySelector("#cgpa-ring").setAttribute("aria-label", `Cumulative GPA ${formatPoints(result.cgpa)} out of ${formatPoints(currentScale())}`);
}

function renderHistory() {
  historyList.replaceChildren();
  document.querySelector("#semester-count").textContent = String(history.length);
  const hasHistory = history.length > 0;
  document.querySelector("#export-csv").disabled = !hasHistory;
  document.querySelector("#clear-history").disabled = !hasHistory;
  gradeScale.disabled = hasHistory;
  document.querySelector("#cgpa-ring").style.setProperty("--ring-progress", "0%");

  if (!hasHistory) {
    const item = document.createElement("li");
    item.className = "empty-history";
    item.textContent = "Your saved terms will appear here.";
    historyList.append(item);
    document.querySelector("#cgpa-value").innerHTML = `—<span> / ${formatPoints(currentScale())}</span>`;
    document.querySelector("#cgpa-caption").textContent = "Save a semester to start your tracker.";
    document.querySelector("#cgpa-ring-text").textContent = "—";
    document.querySelector("#cgpa-ring").setAttribute("aria-label", "No saved semester scores yet");
    document.querySelector("#target-result").textContent = "Save completed semester credits to explore a target.";
    return;
  }

  let cgpa;
  try {
    cgpa = GPACore.calculateCgpa(history, currentScale());
    setCgpaDisplay(cgpa);
  } catch (error) {
    document.querySelector("#cgpa-caption").textContent = error.message;
    document.querySelector("#cgpa-ring-text").textContent = "!";
    document.querySelector("#cgpa-ring").setAttribute("aria-label", error.message);
  }

  for (const [index, semester] of history.entries()) {
    const item = document.createElement("li");
    item.className = "semester-item";
    const details = document.createElement("div");
    details.className = "semester-details";
    const name = document.createElement("strong");
    name.textContent = semester.name;
    const meta = document.createElement("span");
    meta.textContent = `${formatPoints(semester.credits).replace(/\.00$/, "")} credits · ${new Date(semester.savedAt).toLocaleDateString()}`;
    details.append(name, meta);
    const score = document.createElement("span");
    score.className = "semester-score";
    score.textContent = formatPoints(semester.sgpa);
    const remove = document.createElement("button");
    remove.className = "remove-semester";
    remove.type = "button";
    remove.dataset.index = String(index);
    remove.setAttribute("aria-label", `Remove ${semester.name}`);
    remove.title = "Remove semester";
    remove.textContent = "×";
    item.append(details, score, remove);
    historyList.append(item);
  }
  if (cgpa) {
    document.querySelector("#target-result").textContent = "Enter a target CGPA and future credits to see the estimate.";
  }
}

function saveCurrentSemester() {
  const result = calculateCurrentSemester();
  if (!result) return;
  const nameInput = document.querySelector("#term-name");
  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: nameInput.value.trim() || `Semester ${history.length + 1}`,
    sgpa: result.sgpa,
    credits: result.totalCredits,
    qualityPoints: result.qualityPoints,
    maxPoints: result.maxPoints,
    savedAt: new Date().toISOString(),
  };
  history = [...history, entry];
  if (!writeHistory()) {
    history = history.slice(0, -1);
    return;
  }
  renderHistory();
  saveButton.disabled = true;
  setMessage(`${entry.name} saved in this browser.`, "success");
}

function calculateTarget() {
  const target = document.querySelector("#target-cgpa").value;
  const credits = document.querySelector("#future-credits").value;
  const output = document.querySelector("#target-result");
  try {
    const plan = GPACore.calculateRequiredGpa(history, target, credits, currentScale());
    if (plan.status === "above-scale") {
      output.textContent = `This target would require ${formatPoints(plan.requiredGpa)} average grade points, above your ${formatPoints(currentScale())}-point scale for the next ${formatPoints(plan.futureCredits).replace(/\.00$/, "")} credits.`;
    } else if (plan.status === "already-achieved") {
      output.textContent = `Your saved average is already at or above ${formatPoints(plan.targetCgpa)}. Any valid grade-point average in the next credits would keep that target.`;
    } else {
      output.textContent = `You would need an average of ${formatPoints(plan.requiredGpa)} grade points across the next ${formatPoints(plan.futureCredits).replace(/\.00$/, "")} credits to reach ${formatPoints(plan.targetCgpa)}.`;
    }
    output.classList.add("target-calculated");
  } catch (error) {
    output.textContent = error.message;
    output.classList.remove("target-calculated");
  }
}

function exportHistory() {
  if (history.length === 0) return;
  const rows = [["Semester", "SGPA", "Credits", "Quality Points", "Scale", "Saved At"]];
  for (const semester of history) {
    rows.push([semester.name, semester.sgpa, semester.credits, semester.qualityPoints, semester.maxPoints, semester.savedAt]);
  }
  const csv = rows.map((row) => row.map((value) => {
    let safeValue = String(value);
    if (/^[=+@\-]/.test(safeValue)) safeValue = `'${safeValue}`;
    return `"${safeValue.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const file = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gradepath-semester-history.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector("#add-course").addEventListener("click", () => addCourse());
courseList.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-course");
  if (!button) return;
  button.closest("tr").remove();
  markResultStale();
});
form.addEventListener("input", (event) => {
  if (event.target.id === "term-name") return;
  markResultStale();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateCurrentSemester();
});
saveButton.addEventListener("click", saveCurrentSemester);
gradeScale.addEventListener("change", () => {
  updateGradePointInputs();
  markResultStale();
  renderHistory();
});
document.querySelector("#plan-target").addEventListener("click", calculateTarget);
document.querySelector("#export-csv").addEventListener("click", exportHistory);
historyList.addEventListener("click", (event) => {
  const button = event.target.closest(".remove-semester");
  if (!button) return;
  history.splice(Number(button.dataset.index), 1);
  writeHistory();
  renderHistory();
});
document.querySelector("#clear-history").addEventListener("click", () => {
  if (!window.confirm("Clear all saved semester summaries from this browser?")) return;
  history = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    setMessage("The browser could not clear local saved data.");
  }
  renderHistory();
});

for (let index = 0; index < 4; index += 1) courseList.append(createCourseRow());
history = readHistory();
if (history.length > 0 && [4, 5, 10].includes(Number(history[0].maxPoints))) {
  gradeScale.value = String(history[0].maxPoints);
}
updateGradePointInputs();
renderHistory();
