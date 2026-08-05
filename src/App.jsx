import PaperManagementSystem from './PaperManagementSystem.ui';

function App() {
  return (
    <>
      <div className="bg-slate-950 text-white px-4 py-3 text-sm shadow-lg">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Latest package: Screen Scrolling Exercise Intervention, revised manuscript, data, code, tables, and figures.
          </span>
          <a
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-1.5 font-semibold text-slate-950 hover:bg-slate-200"
            href="/downloads/Screen_Scrolling_Exercise_Revised.zip"
            download
          >
            Download ZIP
          </a>
        </div>
      </div>
      <PaperManagementSystem />
    </>
  );
}

export default App;
