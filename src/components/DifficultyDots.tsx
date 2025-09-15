import React from "react";

const DifficultyDots: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <span
        key={n}
        className={`inline-block h-2 w-2 rounded-full ${n <= level ? "bg-amber-500" : "bg-gray-300"}`}
      />
    ))}
  </div>
);

export default DifficultyDots;
