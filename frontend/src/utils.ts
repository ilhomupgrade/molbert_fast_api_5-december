import { ApiError } from "@/client"

export const handleError = (error: unknown) => {
  if (error instanceof ApiError) {
    console.error("API error:", error.status, error.body)
    alert(`Error: ${error.status}`)
  } else {
    console.error(error)
    alert("Something went wrong")
  }
}

export const emailPattern = {
  value:
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/,
  message: "Invalid email",
}

export const passwordRules = () => ({
  required: "Password is required",
  minLength: { value: 8, message: "Minimum 8 characters" },
})
