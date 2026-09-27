import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response): Promise<void> {
	const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
	const apiRoute = requestUrl.searchParams.get('__api_route');
	if (apiRoute) {
		if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/i.test(apiRoute)) {
			res.status(400).json({ error: { code: 'INVALID_API_ROUTE', message: 'A valid API route is required.' } });
			return;
		}
		requestUrl.searchParams.delete('__api_route');
		const query = requestUrl.searchParams.toString();
		req.url = `/api/${apiRoute}${query ? `?${query}` : ''}`;
	}
	const { default: apiHandler } = await import('../packages/api/src/vercel.handler.js');
	return apiHandler(req, res);
}