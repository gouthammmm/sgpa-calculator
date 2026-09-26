/* Small pure calculation module shared by the browser app and Node tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GPACore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function finiteNumber(value, label) {
    if (value === null || value === undefined || String(value).trim() === "") {
      throw new Error(`${label} is required.`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a valid number.`);
    return number;
  }

  function calculateSemester(courses, maxPoints = 10) {
    const scale = finiteNumber(maxPoints, "Grade-point scale");
    if (!Array.isArray(courses)) throw new Error("Enter courses to calculate SGPA.");
    const included = courses.filter((course) =>
      [course.name, course.credits, course.gradePoints].some((value) => String(value ?? "").trim() !== ""),
    );
    if (included.length === 0) throw new Error("Add at least one course with credits and grade points.");

    let totalCredits = 0;
    let qualityPoints = 0;
    const normalizedCourses = included.map((course, index) => {
      const label = String(course.name ?? "").trim() || `Course ${index + 1}`;
      const credits = finiteNumber(course.credits, `${label}: credits`);
      const gradePoints = finiteNumber(course.gradePoints, `${label}: grade points`);
      if (credits <= 0 || credits > 60) throw new Error(`${label}: credits must be greater than 0 and no more than 60.`);
      if (gradePoints < 0 || gradePoints > scale) throw new Error(`${label}: grade points must be from 0 to ${scale}.`);
      totalCredits += credits;
      qualityPoints += credits * gradePoints;
      return { name: label, credits, gradePoints };
    });

    return {
      courses: normalizedCourses,
      totalCredits,
      qualityPoints,
      sgpa: qualityPoints / totalCredits,
      maxPoints: scale,
    };
  }

  function calculateCgpa(semesters, maxPoints = 10) {
    const scale = finiteNumber(maxPoints, "Grade-point scale");
    if (!Array.isArray(semesters) || semesters.length === 0) {
      throw new Error("Save at least one semester before calculating CGPA.");
    }
    let totalCredits = 0;
    let qualityPoints = 0;
    for (const [index, semester] of semesters.entries()) {
      if (Number(semester.maxPoints) !== scale) {
        throw new Error("All saved semesters must use the same grade-point scale.");
      }
      const credits = finiteNumber(semester.credits, `Semester ${index + 1}: credits`);
      const points = semester.qualityPoints == null
        ? finiteNumber(semester.sgpa, `Semester ${index + 1}: SGPA`) * credits
        : finiteNumber(semester.qualityPoints, `Semester ${index + 1}: quality points`);
      if (credits <= 0 || points < 0 || points > credits * scale) {
        throw new Error(`Semester ${index + 1} contains invalid credit or grade-point totals.`);
      }
      totalCredits += credits;
      qualityPoints += points;
    }
    return { totalCredits, qualityPoints, cgpa: qualityPoints / totalCredits, maxPoints: scale };
  }

  function calculateRequiredGpa(semesters, targetCgpa, futureCredits, maxPoints = 10) {
    const target = finiteNumber(targetCgpa, "Target CGPA");
    const upcomingCredits = finiteNumber(futureCredits, "Future credits");
    const scale = finiteNumber(maxPoints, "Grade-point scale");
    if (target < 0 || target > scale) throw new Error(`Target CGPA must be from 0 to ${scale}.`);
    if (upcomingCredits <= 0 || upcomingCredits > 200) {
      throw new Error("Future credits must be greater than 0 and no more than 200.");
    }
    const current = calculateCgpa(semesters, scale);
    const requiredGpa =
      (target * (current.totalCredits + upcomingCredits) - current.qualityPoints) / upcomingCredits;
    return {
      requiredGpa,
      targetCgpa: target,
      futureCredits: upcomingCredits,
      maxPoints: scale,
      status: requiredGpa > scale ? "above-scale" : requiredGpa <= 0 ? "already-achieved" : "within-scale",
    };
  }

  return { calculateSemester, calculateCgpa, calculateRequiredGpa };
});
