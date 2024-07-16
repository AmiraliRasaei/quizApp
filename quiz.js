// quiz.js

// State management
const state = {
    questions: [],
    questionFiles: [],
    currentQuestionsFileIndex: 0,
    timeElapsed: 0,
    timerId: null,
};

// Utility functions
const fetchQuestionFiles = async () => {
    const response = await fetch('azure/questionFiles.json');
    if (!response.ok) {
        throw new Error('Failed to fetch list of question files');
    }
    return await response.json();
};

const fetchQuestions = async (filePath) => {
    const response = await fetch(`azure/${filePath}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch questions from ${filePath}`);
    }
    return await response.json();
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};

const generateId = (prefix, questionIndex, statementIndex) => {
    return `${prefix}-q${questionIndex}-s${statementIndex}`;
};

const renderSummaryTable = (questions) => {
    console.log(`Rendering summary table for ${questions.length} questions`);
    const summaryTableContainer = document.getElementById('summaryTableContainer');
    let summaryHTML = `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Question Number</th>
                    <th>Question Type</th>
                    <th>Correct</th>
                    <th>Incorrect</th>
                    <th>Not Answered</th>
                </tr>
            </thead>
            <tbody>
    `;

    questions.forEach((question, index) => {
        summaryHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${question.type}</td>
                <td id="correct-${index + 1}"></td>
                <td id="incorrect-${index + 1}"></td>
                <td id="not-answered-${index + 1}"></td>
            </tr>
        `;
    });

    summaryHTML += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2">Total</td>
                    <td id="total-correct"></td>
                    <td id="total-incorrect"></td>
                    <td id="total-not-answered"></td>
                </tr>
                <tr>
                    <td colspan="5">Total Questions: <span id="total-questions">${questions.length}</span></td>
                </tr>
            </tfoot>
        </table>
    `;

    summaryTableContainer.innerHTML = summaryHTML;
};

const renderQuiz = (questions) => {
    console.log(`Rendering quiz for ${questions.length} questions`);
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = ''; // Clear existing content

    questions.forEach((question, questionIndex) => {
        const questionElem = createQuestionElement(question, questionIndex);
        quizContainer.appendChild(questionElem);
    });

    console.log(`Quiz container now has ${quizContainer.children.length} question elements`);
};

const createQuestionElement = (question, questionIndex) => {
    const questionElem = document.createElement('div');
    questionElem.className = 'card my-5';
    questionElem.id = `question-${questionIndex}`; // Assign unique ID
    questionElem.dataset.type = question.type; // Assign question type
    questionElem.dataset.correctAnswer = JSON.stringify(question.correctAnswer);
    if (question.correctOrder) {
        questionElem.dataset.correctOrder = JSON.stringify(question.correctOrder);
    }

    const imageHTML = question.image ? `<img src="${question.image}" class="img-fluid mb-3" alt="Question image">` : '';

    const collapseId = `collapseExample${questionIndex}`;
    const explanationHTML = question.explanation ? `
        <a class="btn btn-primary mt-2" data-bs-toggle="collapse" href="#${collapseId}" role="button" aria-expanded="false" aria-controls="${collapseId}">
            Show Explanation
        </a>
        <div class="collapse" id="${collapseId}">
            <div class="card card-body my-3">
                ${question.explanation}
            </div>
        </div>
    ` : '';

    let optionsHTML = '';
    switch (question.type) {
        case 'single':
            optionsHTML = renderSingleChoice(question, questionIndex);
            break;
        case 'multi':
            optionsHTML = renderMultipleChoice(question, questionIndex);
            break;
        case 'drag':
            optionsHTML = renderDragAndDrop(question, questionIndex);
            break;
        case 'hotarea':
            optionsHTML = renderHotArea(question, questionIndex);
            break;
    }

    questionElem.innerHTML = `
        <div class="card-header">Question ${questionIndex + 1}</div>
        <div class="card-body">
            <blockquote class="blockquote mb-0">
                <p>${question.question}</p>
                ${imageHTML}
                ${optionsHTML}
                ${explanationHTML}
            </blockquote>
        </div>
    `;

    return questionElem;
};

const renderSingleChoice = (question, index) => {
    let optionsHTML = '';
    const optionsEntries = Object.entries(question.options);
    optionsEntries.forEach(([key, value], optionIndex) => {
        const isCorrect = question.correctAnswer.includes(key);
        optionsHTML += `
            <div class="alert" role="alert">
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="question${index}" id="q${index}option${optionIndex}" data-correct="${isCorrect}">
                    <label class="form-check-label" for="q${index}option${optionIndex}">${value}</label>
                </div>
            </div>
        `;
    });
    return optionsHTML;
};

const renderMultipleChoice = (question, index) => {
    let optionsHTML = '';
    const optionsEntries = Object.entries(question.options);
    optionsEntries.forEach(([key, value], optionIndex) => {
        const isCorrect = question.correctAnswer.includes(key);
        optionsHTML += `
            <div class="alert" role="alert">
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="question${index}" id="q${index}option${optionIndex}" data-correct="${isCorrect}">
                    <label class="form-check-label" for="q${index}option${optionIndex}">${value}</label>
                </div>
            </div>
        `;
    });
    return optionsHTML;
};

const renderDragAndDrop = (question, index) => {
    let draggableHTML = '<div id="draggable-container">';
    let droppableHTML = '<div id="drop-container">';
    question.options.forEach((option, i) => {
        draggableHTML += `<div class="draggable" draggable="true" id="q${index}item${i}">${option}</div>`;
        droppableHTML += `<div class="droppable" id="q${index}drop${i}"></div>`;
    });
    draggableHTML += '</div>';
    droppableHTML += '</div>';

    setTimeout(() => { // Add event listeners after elements are added to DOM
        const draggables = document.querySelectorAll(`#quizContainer .draggable`);
        const droppables = document.querySelectorAll(`#quizContainer .droppable`);

        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', dragStart);
        });

        droppables.forEach(droppable => {
            droppable.addEventListener('dragover', dragOver);
            droppable.addEventListener('drop', drop);
        });
    }, 0);

    return draggableHTML + droppableHTML;
};

const renderHotArea = (question, questionIndex) => {
    let optionsHTML = '<div class="hot-area-container">';
    question.options.forEach((option, statementIndex) => {
        const elementId = generateId('hotarea', questionIndex, statementIndex);
        optionsHTML += `
            <div class="mb-2">
                <p>${option.label}</p>
                <select class="form-select" id="${elementId}" name="${elementId}">
                    <option value="">Select</option>
        `;
        option.choices.forEach(choice => {
            optionsHTML += `<option value="${choice}">${choice}</option>`;
        });
        optionsHTML += `
                </select>
            </div>
        `;
    });
    optionsHTML += '</div>';
    return optionsHTML;
};

// Event handlers
document.addEventListener('DOMContentLoaded', async function () {
    try {
        state.questionFiles = await fetchQuestionFiles();
        if (state.questionFiles.length === 0) {
            throw new Error('No question files found');
        }

        const currentQuestionsFile = state.questionFiles[state.currentQuestionsFileIndex];
        state.questions = await fetchQuestions(currentQuestionsFile);
        console.log(`Fetched ${state.questions.length} questions from ${currentQuestionsFile}`);
        renderSummaryTable(state.questions);
        renderQuiz(state.questions);

        // Start the timer
        const timerDisplayElement = document.getElementById('timerDisplay');
        state.timerId = setInterval(() => {
            state.timeElapsed++;
            const minutes = Math.floor(state.timeElapsed / 60);
            const seconds = state.timeElapsed % 60;
            timerDisplayElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }, 1000);

        document.getElementById('submitQuizButton').addEventListener('click', () => {
            setTimeout(evaluateQuiz, 500); // Delay evaluation to ensure DOM is fully loaded
        });

        document.getElementById('shuffleQuizButton').addEventListener('click', () => {
            shuffleArray(state.questions); // Shuffle questions
            state.questions.forEach(question => {
                if (question.type !== 'drag') {
                    if (Array.isArray(question.options)) {
                        shuffleArray(question.options);
                    } else if (typeof question.options === 'object' && question.options !== null) {
                        const optionsEntries = Object.entries(question.options);
                        shuffleArray(optionsEntries);
                        question.options = Object.fromEntries(optionsEntries);
                    }
                }
            });
            renderQuiz(state.questions); // Regenerate the quiz UI with shuffled questions and answers
        });

        document.getElementById('toggleQuestionsButton').addEventListener('click', async () => {
            state.currentQuestionsFileIndex = (state.currentQuestionsFileIndex + 1) % state.questionFiles.length;
            const currentQuestionsFile = state.questionFiles[state.currentQuestionsFileIndex];
            state.questions = await fetchQuestions(currentQuestionsFile);
            console.log(`Fetched ${state.questions.length} questions from ${currentQuestionsFile}`);
            renderSummaryTable(state.questions);
            renderQuiz(state.questions);
        });

    } catch (error) {
        console.error(error);
    }
});

// Drag and Drop Event Handlers
const dragStart = (event) => {
    event.dataTransfer.setData('text/plain', event.target.id);
};

const dragOver = (event) => {
    event.preventDefault();
};

const drop = (event) => {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    const draggableElement = document.getElementById(data);
    if (event.target.classList.contains('droppable') && event.target.children.length === 0) {
        event.target.appendChild(draggableElement);
    }
};

// Evaluation functions
const evaluateQuiz = () => {
    const questionBlocks = document.querySelectorAll('.card[id^="question-"]'); // Select only question blocks
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalNotAnswered = 0;

    console.log(`Evaluating ${questionBlocks.length} questions`);

    questionBlocks.forEach((block, questionIndex) => {
        if (questionIndex >= state.questions.length) {
            console.error(`Question index ${questionIndex + 1} exceeds available questions.`);
            return;
        }
        
        const questionType = block.dataset.type;
        let isQuestionCorrect = false;
        let isQuestionAnswered = false;

        switch (questionType) {
            case 'single':
                isQuestionCorrect = evaluateSingleChoice(block);
                isQuestionAnswered = checkIfSingleAnswered(block);
                break;
            case 'multi':
                isQuestionCorrect = evaluateMultipleChoice(block);
                isQuestionAnswered = checkIfMultipleAnswered(block);
                break;
            case 'drag':
                isQuestionCorrect = evaluateDragAndDrop(block, questionIndex);
                isQuestionAnswered = checkIfDragAndDropAnswered(block);
                break;
            case 'hotarea':
                isQuestionCorrect = evaluateHotArea(block, questionIndex);
                isQuestionAnswered = checkIfHotAreaAnswered(block, questionIndex);
                break;
        }

        const correctCell = document.getElementById(`correct-${questionIndex + 1}`);
        const incorrectCell = document.getElementById(`incorrect-${questionIndex + 1}`);
        const notAnsweredCell = document.getElementById(`not-answered-${questionIndex + 1}`);
        const cardHeader = block.querySelector('.card-header');

        if (correctCell && incorrectCell && notAnsweredCell) {
            correctCell.textContent = '';
            incorrectCell.textContent = '';
            notAnsweredCell.textContent = '';

            if (isQuestionCorrect) {
                correctCell.textContent = '✔';
                totalCorrect++;
            } else if (isQuestionAnswered) {
                incorrectCell.textContent = '✘';
                totalIncorrect++;
            } else {
                notAnsweredCell.textContent = '✘';
                totalNotAnswered++;
            }
        } else {
            console.error(`Summary cells not found for question ${questionIndex + 1}`);
        }

        if (isQuestionCorrect) {
            if (cardHeader) {
                cardHeader.classList.remove('alert-danger');
            }
        } else {
            if (cardHeader) {
                cardHeader.classList.add('alert', 'alert-danger');
            }
        }
    });

    document.getElementById('total-correct').textContent = totalCorrect;
    document.getElementById('total-incorrect').textContent = totalIncorrect;
    document.getElementById('total-not-answered').textContent = totalNotAnswered;

    clearInterval(state.timerId);

    window.scrollTo(0, 0);
};


const evaluateSingleChoice = (block) => {
    const optionsContainers = block.querySelectorAll('.alert');
    let isQuestionCorrect = false;

    optionsContainers.forEach(container => {
        const input = container.querySelector('input[type="radio"]');
        if (input) {
            const isCorrect = input.dataset.correct === "true";
            const isSelected = input.checked;

            if (isCorrect && isSelected) {
                isQuestionCorrect = true;
            }

            container.classList.remove('alert-success', 'alert-danger');
            if (isCorrect) {
                container.classList.add('alert-success');
            } else if (isSelected) {
                container.classList.add('alert-danger');
            }
        }
    });

    return isQuestionCorrect;
};

const evaluateMultipleChoice = (block) => {
    const optionsContainers = block.querySelectorAll('.alert');
    let allCorrect = true;
    let anySelected = false;

    optionsContainers.forEach(container => {
        const input = container.querySelector('input[type="checkbox"]');
        if (input) {
            const isCorrect = input.dataset.correct === "true";
            const isSelected = input.checked;

            if (isSelected) {
                anySelected = true;
            }

            if ((isCorrect && !isSelected) || (!isCorrect && isSelected)) {
                allCorrect = false;
            }

            container.classList.remove('alert-success', 'alert-danger');
            if (isCorrect) {
                container.classList.add('alert-success');
            } else if (isSelected) {
                container.classList.add('alert-danger');
            }
        }
    });

    return allCorrect && anySelected;
};

const evaluateDragAndDrop = (block, index) => {
    const correctOrderString = block.dataset.correctOrder;

    if (!correctOrderString) {
        console.error('Order not given for question', index + 1);
        return false;
    }

    const correctOrder = JSON.parse(correctOrderString);
    const droppables = block.querySelectorAll('.droppable');
    const currentOrder = Array.from(droppables).map(droppable => {
        const draggable = droppable.querySelector('.draggable');
        if (draggable) {
            const id = draggable.id.match(/\d+$/)[0];
            return parseInt(id);
        }
        return null;
    }).filter(id => id !== null);

    const filteredCurrentOrder = currentOrder.slice(0, correctOrder.length);

    return JSON.stringify(filteredCurrentOrder) === JSON.stringify(correctOrder);
};

const evaluateHotArea = (block, questionIndex) => {
    const correctAnswerArray = JSON.parse(block.dataset.correctAnswer);

    if (!correctAnswerArray) {
        console.error('Correct answer not given for hot area question');
        return false;
    }

    let isQuestionCorrect = true;

    correctAnswerArray.forEach((correctAnswer, statementIndex) => {
        const elementId = generateId('hotarea', questionIndex, statementIndex);
        const selectedElement = document.getElementById(elementId);

        if (!selectedElement) {
            console.error(`Element with ID ${elementId} not found`);
            isQuestionCorrect = false;
            return;
        }

        const selectedOption = selectedElement.value;
        if (selectedOption !== correctAnswer) {
            isQuestionCorrect = false;
        }
    });

    return isQuestionCorrect;
};

const checkIfSingleAnswered = (block) => {
    const optionsContainers = block.querySelectorAll('.alert');
    return Array.from(optionsContainers).some(container => {
        const input = container.querySelector('input[type="radio"]');
        return input && input.checked;
    });
};

const checkIfMultipleAnswered = (block) => {
    const optionsContainers = block.querySelectorAll('.alert');
    return Array.from(optionsContainers).some(container => {
        const input = container.querySelector('input[type="checkbox"]');
        return input && input.checked;
    });
};

const checkIfDragAndDropAnswered = (block) => {
    const droppables = block.querySelectorAll('.droppable');
    return Array.from(droppables).some(droppable => {
        const draggable = droppable.querySelector('.draggable');
        return draggable !== null;
    });
};

const checkIfHotAreaAnswered = (block, questionIndex) => {
    const correctAnswerArray = JSON.parse(block.dataset.correctAnswer);

    for (let i = 0; i < correctAnswerArray.length; i++) {
        const elementId = generateId('hotarea', questionIndex, i);
        const element = document.getElementById(elementId);
        if (element && element.value === "") {
            return false;
        }
    }
    return true;
};
