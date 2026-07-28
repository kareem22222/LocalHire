export async function withMinimumDelay(task, milliseconds = 1500) {
  const [result] = await Promise.allSettled([
    Promise.resolve().then(task),
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ])
  if (result.status === 'rejected') throw result.reason
  return result.value
}
