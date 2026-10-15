export function validate(parse, source = 'body') {
 return (req, res, next) => {
  try { res.locals.input = parse(req[source]); next(); } catch (error) { next(error); }
 };
}
