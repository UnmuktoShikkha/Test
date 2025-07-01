(function () {
  const url = window.quizDataUrl;
  if (!url) {
    document.getElementById('quiz-container').innerHTML = '<pre>Quiz URL not found.</pre>';
    return;
  }

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not OK');
      return response.json();
    })
    .then(data => {
      renderQuiz(data);
    })
    .catch(error => {
      document.getElementById('quiz-container').innerHTML = `<pre>ডাটা লোড করতে সমস্যা হয়েছে:\n${error.message}</pre>`;
      const buttonWrapper = document.querySelector('.button-wrapper');
      if (buttonWrapper) buttonWrapper.remove();
      console.error('Fetch error:', error);
    });

  function toBanglaNumber(num) {
    const banglaDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return num.toString().split('').map(d => banglaDigits[d] || d).join('');
  }

  function renderQuestion(num, qData) {
    const correctAnswers = (qData.a || qData.answer).map(a => a.toLowerCase());
    const isMulti = correctAnswers.length > 1;
    const optionLabels = ['a', 'b', 'c', 'd', 'e', 'f'];
    const questionText = qData.question || qData.q;
    const optionsList = qData.options || qData.o;

    return `
      <div class="quiz-question" data-correct="${correctAnswers.join('+')}" data-multi="${isMulti}">
        <b>প্রশ্ন ${toBanglaNumber(num)}: ${questionText}</b><br>
        <div class="quiz-options">
          ${optionsList.map((opt, i) => {
            const value = optionLabels[i];
            const banglaLetter = String.fromCharCode(0x0995 + i); // ক=০x0995
            const inputId = `q${num}_${value}`;
            return `
              <div class="quiz-option">
                <input type="${isMulti ? 'checkbox' : 'radio'}" id="${inputId}" name="q${num}" value="${value}">
                <label for="${inputId}" data-label="${banglaLetter}">${opt}</label>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderQuiz(data) {
    const container = document.getElementById('quiz-container');
    let html = '';
    let questionNumber = 1;

    data.forEach(item => {
      if (item.q && Array.isArray(item.o)) {
        html += renderQuestion(questionNumber++, item);
      } else if (item.u && Array.isArray(item.qs)) {
        const start = questionNumber;
        const end = questionNumber + item.qs.length - 1;
        let label = '';
        if (start === end) {
          label = `${toBanglaNumber(start)}`;
        } else if (end - start === 1) {
          label = `${toBanglaNumber(start)} ও ${toBanglaNumber(end)}`;
        } else {
          label = `${toBanglaNumber(start)} থেকে ${toBanglaNumber(end)}`;
        }

        html += `
          <div class="uddipok">
            <b>উদ্দীপকটি পড়ে ${label} নং প্রশ্নের উত্তর দাও:</b><br>
            <span>${item.u}</span>
          </div>
        `;

        item.qs.forEach(q => {
          html += renderQuestion(questionNumber++, q);
        });
      }
    });

    container.innerHTML = html;

    attachInputListeners();
    updateSubmitButtonText();
  }

  function showCorrectAnswersOnly() {
    const allQuestions = document.querySelectorAll('.quiz-question');

    allQuestions.forEach(div => {
      const correctAns = div.getAttribute('data-correct').split('+');
      const labels = div.querySelectorAll('label');
      labels.forEach(label => {
        label.classList.remove('correct', 'correct-reverse', 'incorrect');
        const input = document.getElementById(label.htmlFor);
        if (input && correctAns.includes(input.value)) {
          label.classList.remove('correct');
          void label.offsetWidth;
          label.classList.add('correct');
          input.checked = true;
        }
      });
    });

    const allInputs = document.querySelectorAll('#quiz-container input');
    allInputs.forEach(input => input.disabled = true);
    document.getElementById('submit-btn').disabled = true;
  }

  function submitQuiz() {
    const allQuestions = document.querySelectorAll('.quiz-question');

    const anySelected = Array.from(document.querySelectorAll('#quiz-container input')).some(input => input.checked);

    if (!anySelected) {
      showCorrectAnswersOnly();
      return;
    }

    let correct = 0;

    allQuestions.forEach(div => {
      const correctAns = div.getAttribute('data-correct').split('+');
      const isMulti = div.getAttribute('data-multi') === "true";
      const labels = div.querySelectorAll('label');
      labels.forEach(label => label.classList.remove('correct', 'incorrect'));

      let selected = [];
      if (isMulti) {
        selected = Array.from(div.querySelectorAll('input[type=checkbox]:checked')).map(i => i.value);
      } else {
        const input = div.querySelector('input[type=radio]:checked');
        if (input) selected = [input.value];
      }

      labels.forEach(label => {
        const input = document.getElementById(label.htmlFor);
        if (correctAns.includes(input.value)) {
          label.classList.remove('correct');
          void label.offsetWidth;
          label.classList.add('correct');
        }
      });

      selected.forEach(val => {
        if (!correctAns.includes(val)) {
          labels.forEach(label => {
            const input = document.getElementById(label.htmlFor);
            if (input.value === val) {
              label.classList.remove('correct');
              label.classList.remove('incorrect');
              void label.offsetWidth;
              label.classList.add('incorrect');
            }
          });
        }
      });

      selected.sort();
      correctAns.sort();
      if (selected.length === correctAns.length && selected.every((v, i) => v === correctAns[i])) {
        correct++;
      }
    });

    document.getElementById('result').innerHTML = `সঠিক উত্তর দিয়েছেন ${toBanglaNumber(correct)}টি প্রশ্নের।`;

    const allInputs = document.querySelectorAll('#quiz-container input');
    allInputs.forEach(input => input.disabled = true);
    document.getElementById('submit-btn').disabled = true;
  }

  function resetQuiz() {
    const correctLabels = document.querySelectorAll('#quiz-container label.correct');
    correctLabels.forEach(label => {
      label.classList.remove('correct');
      label.classList.add('correct-reverse');
      label.addEventListener('animationend', () => {
        label.classList.remove('correct-reverse');
      }, { once: true });
    });

    const incorrectLabels = document.querySelectorAll('#quiz-container label.incorrect');
    incorrectLabels.forEach(label => {
      label.classList.remove('incorrect');
      label.classList.add('incorrect-reverse');
      label.addEventListener('animationend', () => {
        label.classList.remove('incorrect-reverse');
      }, { once: true });
    });

    const allInputs = document.querySelectorAll('#quiz-container input');
    allInputs.forEach(input => {
      input.disabled = false;
      input.checked = false;
    });

    document.getElementById('result').textContent = '';
    document.getElementById('submit-btn').disabled = false;

    updateSubmitButtonText();
  }

  function updateSubmitButtonText() {
    const anySelected = Array.from(document.querySelectorAll('#quiz-container input')).some(input => input.checked);
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerHTML = anySelected ? 'ফলাফল দেখি' : 'উত্তর দেখি';
  }

  function attachInputListeners() {
    const inputs = document.querySelectorAll('#quiz-container input');
    inputs.forEach(input => {
      input.addEventListener('change', updateSubmitButtonText);
    });
  }

  document.getElementById('submit-btn')?.addEventListener('click', submitQuiz);
  document.getElementById('reset-btn')?.addEventListener('click', resetQuiz);
})();
