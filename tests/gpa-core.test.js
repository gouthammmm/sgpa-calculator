const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateSemester, calculateCgpa, calculateRequiredGpa } = require("../gpa-core.js");

test("SGPA weights each grade point by course credits", () => {
  const result = calculateSemester([
    { name: "Algorithms", credits: "3", gradePoints: "9" },
    { name: "Databases", credits: "4", gradePoints: "8" },
    { name: "Lab", credits: "2", gradePoints: "10" },
  ], 10);
  assert.equal(result.totalCredits, 9);
  assert.equal(result.qualityPoints, 79);
  assert.equal(result.sgpa, 79 / 9);
});

test("blank course rows are ignored while a partially filled row is rejected", () => {
  const result = calculateSemester([
    { name: "Course 1", credits: "2", gradePoints: "8" },
    { name: "", credits: "", gradePoints: "" },
  ]);
  assert.equal(result.sgpa, 8);
  assert.throws(
    () => calculateSemester([{ name: "Course 2", credits: "3", gradePoints: "" }]),
    /grade points is required/i,
  );
});

test("invalid credits and grade points are rejected against the selected scale", () => {
  assert.throws(() => calculateSemester([{ credits: 0, gradePoints: 7 }]), /credits must be greater than 0/i);
  assert.throws(() => calculateSemester([{ credits: 3, gradePoints: 4.1 }], 4), /from 0 to 4/i);
  assert.throws(() => calculateSemester([], 10), /at least one course/i);
});

test("CGPA weights saved semester scores by attempted credits", () => {
  const result = calculateCgpa([
    { sgpa: 8.5, credits: 20, maxPoints: 10 },
    { sgpa: 9, credits: 24, maxPoints: 10 },
  ], 10);
  assert.equal(result.totalCredits, 44);
  assert.equal(result.qualityPoints, 386);
  assert.equal(result.cgpa, 386 / 44);
});

test("future target calculation returns the required GPA and flags impossible targets", () => {
  const semesters = [{ sgpa: 8.5, credits: 20, qualityPoints: 170, maxPoints: 10 }];
  assert.equal(calculateRequiredGpa(semesters, 8.8, 20, 10).requiredGpa, 9.1);
  assert.equal(calculateRequiredGpa(semesters, 5, 1, 10).status, "already-achieved");
  assert.equal(calculateRequiredGpa([{ sgpa: 6.5, credits: 10, maxPoints: 10 }], 9.5, 2).status, "above-scale");
});

test("CGPA will not combine semesters from different grading scales", () => {
  assert.throws(
    () => calculateCgpa([
      { sgpa: 3.5, credits: 15, maxPoints: 4 },
      { sgpa: 8.5, credits: 18, maxPoints: 10 },
    ], 4),
    /same grade-point scale/i,
  );
});
