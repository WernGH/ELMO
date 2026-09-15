/**
 * ELMO Phase 3 — Web/Coding Controlled Tool Layer (WebCodingToolsService)
 *
 * Controlled filesystem and project manipulation tools for the Web/Coding Agent.
 *
 * CRITICAL SAFETY RULES:
 * 1. Sandboxed exclusively to the active organization's workspace (`virtual-projects/${organizationId}`).
 * 2. Strict rejection of directory traversal attempts (e.g. `../`, `..\`, absolute system paths).
 * 3. Never grants direct shell/terminal execution or direct production database write.
 * 4. All file and component modifications pass through tenant-authorized domain operations.
 */

import { CodeValidationResult } from "../types/agentic.types";

export interface VirtualFile {
  path: string;
  content: string;
  updatedAt: number;
  sizeBytes: number;
}

export interface WebToolResult<T = unknown> {
  success: boolean;
  data: T | null;
  error?: string;
}

export class WebCodingToolsService {
  private static instance: WebCodingToolsService;
  // In-memory tenant virtual filesystem storage: orgId -> Map<normalizedPath, VirtualFile>
  private virtualFilesystems: Map<string, Map<string, VirtualFile>> = new Map();

  private constructor() {}

  public static getInstance(): WebCodingToolsService {
    if (!WebCodingToolsService.instance) {
      WebCodingToolsService.instance = new WebCodingToolsService();
    }
    return WebCodingToolsService.instance;
  }

  public reset(): void {
    this.virtualFilesystems.clear();
  }

  /**
   * Sanitizes and bounds a requested path strictly to tenant project sandbox.
   */
  private normalizeAndValidatePath(organizationId: string, inputPath: string): string {
    if (!organizationId) {
      throw new Error("Security Violation: Missing organization context for file operation.");
    }

    // Reject dangerous path traversal sequences
    if (
      inputPath.includes("..") ||
      inputPath.startsWith("/") ||
      inputPath.startsWith("\\") ||
      /^[a-zA-Z]:/.test(inputPath) ||
      inputPath.includes("node_modules") ||
      inputPath.includes(".env")
    ) {
      throw new Error(`Security Violation: Unauthorized path or directory traversal attempt: "${inputPath}"`);
    }

    const cleanPath = inputPath.replace(/\\/g, "/").replace(/^\/+/, "");
    return cleanPath;
  }

  private getOrgFs(organizationId: string): Map<string, VirtualFile> {
    if (!this.virtualFilesystems.has(organizationId)) {
      this.virtualFilesystems.set(organizationId, new Map());
    }
    return this.virtualFilesystems.get(organizationId)!;
  }

  // ==========================================================================
  // Controlled Filesystem Tools
  // ==========================================================================

  public async fileCreate(
    organizationId: string,
    filePath: string,
    content: string
  ): Promise<WebToolResult<{ path: string; sizeBytes: number }>> {
    try {
      const path = this.normalizeAndValidatePath(organizationId, filePath);
      const fs = this.getOrgFs(organizationId);

      const file: VirtualFile = {
        path,
        content,
        updatedAt: Date.now(),
        sizeBytes: Buffer.byteLength(content, "utf8"),
      };

      fs.set(path, file);
      return { success: true, data: { path, sizeBytes: file.sizeBytes } };
    } catch (err: unknown) {
      return { success: false, data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async fileRead(
    organizationId: string,
    filePath: string
  ): Promise<WebToolResult<{ path: string; content: string }>> {
    try {
      const path = this.normalizeAndValidatePath(organizationId, filePath);
      const fs = this.getOrgFs(organizationId);
      const file = fs.get(path);

      if (!file) {
        return { success: false, data: null, error: `File not found: "${path}"` };
      }

      return { success: true, data: { path, content: file.content } };
    } catch (err: unknown) {
      return { success: false, data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async fileUpdate(
    organizationId: string,
    filePath: string,
    content: string
  ): Promise<WebToolResult<{ path: string; sizeBytes: number }>> {
    return this.fileCreate(organizationId, filePath, content);
  }

  public async fileDelete(
    organizationId: string,
    filePath: string
  ): Promise<WebToolResult<{ path: string; deleted: boolean }>> {
    try {
      const path = this.normalizeAndValidatePath(organizationId, filePath);
      const fs = this.getOrgFs(organizationId);
      const existed = fs.delete(path);
      return { success: existed, data: { path, deleted: existed }, error: existed ? undefined : "File not found" };
    } catch (err: unknown) {
      return { success: false, data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async directoryList(
    organizationId: string,
    dirPrefix = ""
  ): Promise<WebToolResult<string[]>> {
    try {
      const prefix = dirPrefix ? this.normalizeAndValidatePath(organizationId, dirPrefix) : "";
      const fs = this.getOrgFs(organizationId);
      const files = Array.from(fs.keys()).filter((p) => (prefix ? p.startsWith(prefix) : true));
      return { success: true, data: files };
    } catch (err: unknown) {
      return { success: false, data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async projectSearch(
    organizationId: string,
    query: string
  ): Promise<WebToolResult<Array<{ path: string; snippet: string }>>> {
    try {
      const fs = this.getOrgFs(organizationId);
      const matches: Array<{ path: string; snippet: string }> = [];
      const lowerQuery = query.toLowerCase();

      for (const [path, file] of fs.entries()) {
        const lowerContent = file.content.toLowerCase();
        if (lowerContent.includes(lowerQuery)) {
          const idx = lowerContent.indexOf(lowerQuery);
          const start = Math.max(0, idx - 40);
          const end = Math.min(file.content.length, idx + query.length + 40);
          matches.push({
            path,
            snippet: file.content.substring(start, end).replace(/\n/g, " "),
          });
        }
      }

      return { success: true, data: matches };
    } catch (err: unknown) {
      return { success: false, data: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // ==========================================================================
  // Code Generation, Validation & Build Tools
  // ==========================================================================

  /**
   * Validates generated code for basic syntax correctness and safety rules.
   */
  public validateCode(code: string): CodeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!code || !code.trim()) {
      errors.push("Code content cannot be empty.");
      return { isValid: false, errors, warnings, suggestions };
    }

    // Check for dangerous scripts or raw unrestricted eval
    if (code.includes("eval(") || code.includes("Function(") || code.includes("process.env")) {
      errors.push("Security Check Failed: Disallowed expressions detected in generated code.");
    }

    // Check unclosed tags in JSX / HTML snippets
    const openTags = (code.match(/<([a-zA-Z0-9]+)(\s[^>]*)?>/g) || []).map((t) =>
      t.replace(/[<\s>]/g, "").replace(/\/.*/, "")
    );
    const closeTags = (code.match(/<\/([a-zA-Z0-9]+)>/g) || []).map((t) =>
      t.replace(/[<\/>]/g, "")
    );

    // Filter out void/self-closing elements
    const voidTags = new Set(["img", "input", "br", "hr", "meta", "link"]);
    const filteredOpen = openTags.filter((t) => !voidTags.has(t.toLowerCase()));

    if (Math.abs(filteredOpen.length - closeTags.length) > 5) {
      warnings.push("Potential tag mismatch detected in markup component.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}
