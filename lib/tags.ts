import { TemplateTag, trimResultTransformer } from 'common-tags'

export const trim = new TemplateTag(
  trimResultTransformer('start'),
  trimResultTransformer('end')
)
