export const BRAND_LOGO_SRC = `${import.meta.env.BASE_URL}favicon.svg`

function Brand() {
  return (
    <div className="flex items-center justify-center gap-3">
      <img src={BRAND_LOGO_SRC} alt="" aria-hidden="true" className="h-10 w-10" />
      <span className="text-2xl font-semibold tracking-tight text-slate-900">Infinitude</span>
    </div>
  )
}

export default Brand
