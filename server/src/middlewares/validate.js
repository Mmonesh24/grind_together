import AppError from '../utils/AppError.js';

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message).join(', ');
    return next(new AppError(messages, 400));
  }
  req.validatedBody = result.data;
  next();
};

export default validate;
