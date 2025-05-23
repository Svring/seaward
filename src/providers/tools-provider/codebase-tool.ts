import { z } from 'zod';
import { tool } from 'ai';

export const codebaseFindFilesTool = tool({
  description: 'Find files in the project matching specific suffixes and excluding directories.',
  parameters: z.object({
    url: z.string().describe("The base URL of the backend API (e.g., http://localhost:3000)."),
    dir: z.string().describe("Directory path to search from (relative to project root, e.g., 'project/src/')."),
    suffixes: z.array(z.string()).describe("File extensions to search for (e.g., ['ts', 'tsx', 'js'])."),
    exclude_dirs: z.array(z.string()).optional().describe("Directories to exclude (e.g., ['node_modules', 'dist'])."),
  }),
  execute: async ({ url, dir, suffixes, exclude_dirs }) => {
    try {
      const response = await fetch(`${url}/galatea/api/project/find-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dir, suffixes, exclude_dirs }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || "Failed to find files" };
      }

      return {
        success: true,
        files: data.files || [],
        message: `Found ${data.files?.length || 0} files matching criteria`
      };
    } catch (error: any) {
      return { success: false, error: `Failed to find files: ${error.message}` };
    }
  }
});

export const codebaseEditorCommandTool = tool({
  description: "Send an editor command (view, create, str_replace, insert, undo_edit) to the backend for file operations. For 'view', can view a single file using 'path' or multiple files using 'paths'.",
  parameters: z.object({
    url: z.string().describe("The base URL of the backend API (e.g., http://localhost:3000)."),
    command: z.enum(["view", "create", "str_replace", "insert", "undo_edit"]).describe("The editor command to execute."),
    path: z.string().optional().describe("The file path to operate on (relative to project root). Required for non-view commands and single-file view."),
    paths: z.array(z.string()).optional().describe("An array of file paths to view (for multi-file view operations only)."),
    file_text: z.string().optional().describe("The file content for create or replace operations."),
    insert_line: z.number().int().optional().describe("The line number for insert operations (1-based)."),
    new_str: z.string().optional().describe("The new string for insert or str_replace operations."),
    old_str: z.string().optional().describe("The old string to be replaced in str_replace operations."),
    view_range: z.array(z.number()).optional().describe("The line range to view (e.g., [1, 10] or [5, -1] for all lines from 5). Applied to all files in a multi-file view."),
  }).superRefine((data, ctx) => {
    if (data.command === "view") {
      if (!data.path && (!data.paths || data.paths.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "For 'view' command, either 'path' (for single file) or a non-empty 'paths' array (for multiple files) must be provided.",
          path: ["path"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "For 'view' command, either 'path' (for single file) or a non-empty 'paths' array (for multiple files) must be provided.",
          path: ["paths"],
        });
      }
      if (data.path && data.paths && data.paths.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "For 'view' command, provide either 'path' or 'paths', not both.",
          path: ["path", "paths"],
        });
      }
    } else {
      // For non-"view" commands
      if (!data.path) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `'path' is required for command '${data.command}'.`,
          path: ["path"],
        });
      }
      if (data.paths && data.paths.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `'paths' should not be provided for command '${data.command}'.`,
          path: ["paths"],
        });
      }
    }
  }),
  execute: async ({ url, command, path, paths, file_text, insert_line, new_str, old_str, view_range }) => {
    try {
      const body: any = { command, view_range };
      if (command === "view") {
        if (paths && paths.length > 0) {
          body.paths = paths;
        } else {
          body.path = path; // path must be defined here due to superRefine
        }
      } else {
        body.path = path; // path must be defined here due to superRefine
      }
      if (file_text !== undefined) body.file_text = file_text;
      if (insert_line !== undefined) body.insert_line = insert_line;
      if (new_str !== undefined) body.new_str = new_str;
      if (old_str !== undefined) body.old_str = old_str;

      const response = await fetch(`${url}/galatea/api/editor/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.message || data.error || "Failed to execute editor command" };
      }
      return data; // data can be EditorCommandResponse with content or multi_content
    } catch (error: any) {
      return { success: false, error: `Failed to execute editor command: ${error.message}` };
    }
  },
});

export const codebaseNpmScriptTool = tool({
  description: "Run npm scripts (lint or format) in the project root and return their output.",
  parameters: z.object({
    url: z.string().describe("The base URL of the backend API (e.g., http://localhost:3000)."),
    script: z.enum(["lint", "format"]).describe("The npm script to run: 'lint' or 'format'."),
  }),
  execute: async ({ url, script }) => {
    try {
      const response = await fetch(`${url}/galatea/api/project/${script}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.stderr || data.message || "Failed to run npm script" };
      }
      return data;
    } catch (error: any) {
      return { success: false, error: `Failed to run npm script: ${error.message}` };
    }
  },
});

