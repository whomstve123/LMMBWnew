export default function Fallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center p-4">
        <p>Camera access required</p>
        <p className="text-sm mt-2">This experience needs camera access to work properly</p>
      </div>
    </div>
  )
}
