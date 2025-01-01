export const waitFiveSeconds = async () => {
  await new Promise((resolve) => setTimeout(resolve, 5000))
}