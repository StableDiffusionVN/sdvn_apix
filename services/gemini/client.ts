/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

// This creates a single, shared instance of the GoogleGenAI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default ai;