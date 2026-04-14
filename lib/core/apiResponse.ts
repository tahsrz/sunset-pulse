/**
 * SunsetPulse Standardized API Response Helper
 */

export const successResponse = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const errorResponse = (message, status = 500, details = null) => {
  console.error(`[API_ERROR] ${status}: ${message}`, details || '');
  
  return new Response(
    JSON.stringify({
      error: true,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const unauthorizedResponse = (message = 'Unauthorized access restricted.') => errorResponse(message, 401);
export const notFoundResponse = (resource = 'Resource') => errorResponse(`${resource} not found.`, 404);
export const validationErrorResponse = (errors) => errorResponse('Validation failed.', 400, errors);
