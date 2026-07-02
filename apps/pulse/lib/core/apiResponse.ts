/**
 * SunsetPulse Standardized API Response Helper
 */

export const successResponse = (data, metadata = {}, status = 200) => {
  const payload = {
    success: true,
    data,
    metadata: typeof metadata === 'object' ? metadata : { status: metadata },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload), {
    status: typeof metadata === 'number' ? metadata : status,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const errorResponse = (message, status = 500, details = null) => {
  const incidentId = crypto.randomUUID();
  const exposeDetails = status < 500;
  console.error(`[API_ERROR] ${incidentId} ${status}: ${message}`, details || '');
  
  return new Response(
    JSON.stringify({
      error: true,
      message,
      incidentId,
      ...(exposeDetails && details && { details }),
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
