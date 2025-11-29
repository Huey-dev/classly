"use client";

import { IconMoon } from "../component/icons/IconMoon";
import { IconSun } from "../component/icons/IconSun";

export const ThemeToggle = ({
  theme,
  setTheme,
}: {
  theme: string;
  setTheme: (value: string) => void;
}) => (
  <button
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full"
  >
    {theme === "dark" ? <IconSun /> : <IconMoon />}
  </button>
);
