import { ZodError } from 'zod';

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation error',
      issues: error.issues,
    });
  }

  const payload = {
    message: error.message || 'Internal server error',
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
};
