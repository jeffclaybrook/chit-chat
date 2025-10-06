export function getInitials(
 firstName?: string | null,
 lastName?: string | null
) {
 const first = (firstName ?? "").trim()
 const last = (lastName ?? "").trim()
 const firstInitial = first ? first[0]!.toUpperCase() : ""
 const lastInitial = last ? last[0]!.toUpperCase() : ""

 return (firstInitial + lastInitial) || "?"
}