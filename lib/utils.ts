import { interviewCovers, mappings } from "../app/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const normalizeTechName = (tech: string) => {
  if (!tech) return undefined;
  // Convert to lowercase, remove common extensions/spaces
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  // Try mapping or direct match if key exists in mappings
  return mappings[key as keyof typeof mappings] || (Object.values(mappings).includes(key) ? key : undefined);
};

const checkIconExists = async (url: string) => {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
};

export const getTechLogos = async (techArray: string[]) => {
  if (!techArray || !Array.isArray(techArray)) return [];

  const results = await Promise.all(
    techArray.map(async (tech) => {
      const normalized = normalizeTechName(tech);
      if (!normalized) {
        return { tech, url: "/tech.svg" };
      }

      // Try -original first
      const originalUrl = `${techIconBaseURL}/${normalized}/${normalized}-original.svg`;
      const originalExists = await checkIconExists(originalUrl);
      if (originalExists) {
        return { tech, url: originalUrl };
      }

      // Try -plain fallback
      const plainUrl = `${techIconBaseURL}/${normalized}/${normalized}-plain.svg`;
      const plainExists = await checkIconExists(plainUrl);
      if (plainExists) {
        return { tech, url: plainUrl };
      }

      return { tech, url: "/tech.svg" };
    })
  );

  return results;
};


export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};
