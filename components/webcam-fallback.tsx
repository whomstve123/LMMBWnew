export default function WebcamFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center p-4">
        <p className="text-sm">Please allow camera access</p>
      </div>
    </div>
  )
}
