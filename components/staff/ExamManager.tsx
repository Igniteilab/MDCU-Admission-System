import React from 'react';
import { ExamQuestion } from '../../types';
import { getExams, saveExam, deleteExam } from '../../services/storage';
import { Button } from '../ui/Button';

// This is a placeholder for a more complex CRUD exam manager if needed.
// Currently integrated into logic via storage.ts
export const ExamManager: React.FC = () => {
  const [exams, setExams] = React.useState<ExamQuestion[]>(getExams());

  return (
    <div className="p-6 bg-white rounded shadow">
        <h2 className="text-xl font-bold mb-4">Exam Questions</h2>
        <ul>
            {exams.map(e => (
                <li key={e.id} className="border-b py-2 flex justify-between">
                    <span>{e.text} ({e.type})</span>
                    <Button size="sm" variant="danger" onClick={() => {
                        deleteExam(e.id);
                        setExams(getExams());
                    }}>Delete</Button>
                </li>
            ))}
        </ul>
        <p className="text-sm text-gray-500 mt-4">Question editing is managed via configuration in this demo.</p>
    </div>
  );
};