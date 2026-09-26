import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response): Promise<void> {
	const { default: apiHandler } = await import('../packages/api/src/vercel.handler.js');
	return apiHandler(req, res);
}