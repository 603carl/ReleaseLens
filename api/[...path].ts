import type { Request, Response } from 'express';
import apiHandler from '../packages/api/src/vercel.handler.js';

export default function handler(req: Request, res: Response): Promise<void> {
	return apiHandler(req, res);
}