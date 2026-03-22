export const success = (data: any, statusCode = 200) => ({
  statusCode,
  body: JSON.stringify({
    success: true,
    data,
  }),
});

export const error = (message: string, statusCode = 400) => ({
  statusCode,
  body: JSON.stringify({
    success: false,
    message,
  }),
});
