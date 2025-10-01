---
layout: post
title: What is Computational Neuroscience?
subtitle: Where I discuss neurons, Turing machines, and why thinking of the brain as a computational device has been remarkably fruitful.
---

{% katexmm %}
# What is neuroscience?
### Touching a Hot Stove
Accidentally touching a hot stove and burning ones hand is a universal human experience. Usually, before what is happening can even register in your conscious awareness, you rapidly retract your arm from the stove top. Only in the ensuing moments do you begin to feel the pain in your hand. How does this work?

As your hand is placed down on the heat source, temperature-sensitive proteins embedded in the outer membrane of nerve cells in our skin change shape. These proteins form a pore in the membrane, a portal between the outside and inside of the cell. As they change shape the pore opens, allowing positively charged ions like sodium and calcium to flood into the cell. The rush of positive charge catalyzes a complex cascade of biochemical events, ultimately leading the cell to send a barrage of electrical signals up the arm and into the spinal cord. This volley of electricity will eventually cause the sensation of heat to enter your awareness. Before it can do that however, the signals in the spinal cord activate a cellular circuit controlling the muscles in your arm. The cells in this circuit send their own electrical signals to your biceps and triceps where an entirely different biochemical cascade contracts and relaxes them respectively. This coordinated contraction and relaxation of the muscles rapidly bends your arm at the elbow and removes your hand from the stove. All of this happens in a fraction of a second, before you are aware of what has happened or feel any sensation of pain.

Despite my dramatic and elaborate description of this reflex, it is actually one of the simplest circuits we know of in the nervous system. Circuits far more complex are thought to underlie every percept you experience, every thought you have, and every action you take. Understanding how those circuits are built and how they enable those experiences, thoughts, and actions is therefore one of the grand aims of science. How does the brain shape who we are and how we interface with the world around us? For the last 150 years neuroscience has attempted to answer this question.

In the summer of 1875, the doctor Richard Caton reported a remarkable but overlooked result to The British Medical Journal *{% cite Caton_1875 %}*. Dr. Caton had placed a galvanometer (an antiquated, but very sensitive ammeter) on the surface of a rabbits exposed brain and saw that the device was picking up electric currents. Not only were there currents across the surface of the brain, but they seemed to be related to what the animal was *doing*. When the rabbit rotated its head or chewed its food, those areas thought (at the time) to be related to those movements saw a greater signal from the galvanometer. Scientists today would say that Caton had conducted the first electroencephalography (EEG) experiment. EEG is used extensively by contemporary researchers to ask questions about human cognition and psychophysiology. But Caton had discovered something far more fundamental than just a method for conducting research; he discovered that the brain is *electric*<sup>[1](#footnote_1)</sup><a name="back_1"></a>. What exactly that means requires zooming in and identifying the fundamental unit of the brain: the neuron.

<div class='figure'>
    <img src="/assets/images/ram_image_no_bg.png"
         style="width: 100%; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 1.</span> A drawing of the neurons in the spinal cord by Cajal.
    </div>
</div>


### What is a Neuron?
An adult human brain weighs roughly 1.4kg, making up about 2% of a persons total body weight. Within that 1.4kg organ are some 86 billion neurons, commonly called brain cells. *C. elegans* or nematodes, have 302 neurons; the fly *Drosophila* have ~135,000 neurons; mice and the rabbits Dr. Caton worked with have ~70,000,000 neurons; and the macaque monkey has ~6.3 billion neurons *{% cite Xia_2025 %}*. Neurons are famously beautiful for their arborescent form. Projecting from their central compartment, called the soma, are long branching arms which extend outwards and nestle up against other neurons. As in all of biology, the physical form that neurons take is directly related to the function that they serve. The arms of neurons are the shape that they are, because they act essentially as antennae, receiving messages from and sending messages to other neurons, both near and far. For some sense of scale, in humans the longest of these projections pass from the bottom of the spine all the way down to the foot, whilst the shortest may only span a few thousandths of a millimeter. Neuroscientists refer to those projections which *receive* messages from other neurons as dendrites, and those that *send* messages as axons.

What exactly do I mean by *"receiving messages from and sending messages to other neurons"*? How do neurons communicate? Many of you will have heard that neurons "fire", whatever that means. When a neuron fires, it generates what is called an *action-potential* or *spike*: a large, transient change of voltage within the cell. The details of how the action-potential itself is generated are unimportant for this post; for now you can think of the action-potential as simply a pulse of electricity. Once initiated, the pulse propogates from the soma to the end of the axon, whereat the neuron is nearly touching the dendrite of the message-receiving, or target neuron. The arrival of the action-potential at the end of the axon then causes small packets of chemicals called neurotransmitters to fuse to the membrane of the axon and release into the gap between the two cells. These chemicals rapidly diffuse across the gap—called the synapse—and bind to neurotransmitter receptors on the dendritic surface of the target neuron. Upon binding, the chemical signal is translated into *some* effect in the post-synaptic cell. The range of effects that neurotransmitters can have on a cell is vast and dependent on the exact neurotransmitter released as well as what receptors are present on surface of the dendrite. What are these neurotransmitters?

Neurotransmitters constitute many of the biggest household names in neuroscience: dopamine, serotonin, adrenaline, endorphins, etc. As you have likely heard, these chemicals play a large role in determining our affective state, motivation, and arousal. The saliency of those aspects of our lives may lead one to think that neurons which release those neurotransmitters would be widespread and numerous, but in fact they represent roughly 1% of all the neurons in the brain<sup>[2](#footnote_2)</sup><sup>,[3](#footnote_3)</sup>. Instead, the most prevalent of the neurotransmitters are glutamate and gamma-aminobutyric acid (GABA). Compared to the better known brain chemicals, glutamate and GABAs effect on their target neurons are simple: they can either *excite* or *inhibit* them respectively.

By excitation and inhibition, we mean the effect a neuron has on its downstream neurons propensity to fire. If a neuron is *excitatory*, that means it makes its targets more likely to fire. If a neuron is *inhibitory*, that means it makes its targets less likely to fire. If we include neurotransmitters besides glutamate and GABA, this clean picture dividing excitatory and inhibitory becomes much more complex<sup>[4](#footnote_4)</sup>, but for these two it works<sup>[5](#footnote_5)</sup>. What exactly do I mean by "propensity to fire"? Once initiated the action potential is an irreversible event; there is no $\frac{1}{2}$ action potential or $\frac{5}{6}$ action potential, it is an all-or-none event. However, in order for an action potential to unfold, it must first surpass its action potential threshold, a minimum voltage required to kickstart the action potential machinery. As the cell receives excitatory and inhibitory inputs from its upstream neurons, the voltage across the cell is pushed up and down respectively. Only if there is enough excitation from many excitatory signals arriving in quick succession, (or a lack of inhibitory signals) will the neuron surpass its threshold and fire. This is the general logic of neural communication: neurons, depending on if they are excitatory or inhibitory, make their target neurons more or less likely to fire; a neuron may receive inputs from hundreds, even thousands of neurons of both types, and through the integration of all those signals across space and time<sup>[6](#footnote_6)</sup>, may or may not fire at any one moment.


<div class='figure'>
    <img src="/assets/images/ram_image.png"
         style="width: 100%; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 2.</span> Depictions of pyramidal neurons in layers 4 and 5 of cortex by Santiago Ramón y Cajal.
    </div>
</div>

An additional layer of complexity is that, for any one neuron, each of its input neurons need not be equally influential in determining whether it will fire. An input from one cell may nearly guarantee a cell fires or doesn't fire, whereas input from a a different cell may have a relatively modest effect. Critically, this relative strength of a cells inputs is not static and can change over time. We'll see later how changes in these synaptic strengths are foundational to theories for how we learn.


150 years after Catons' discovery, neuroscience is a rapidly evolving and blossoming field. Scientists no longer use galvonometers, but instead have at their disposal sophisticated technologies like [fMRI machines](https://en.wikipedia.org/wiki/Functional_magnetic_resonance_imaging?oldformat=true), [multielectrode arrays](https://en.wikipedia.org/wiki/Microelectrode_array?oldformat=true), [calcium microscopy](https://en.wikipedia.org/wiki/Calcium_imaging?oldformat=true), and [optogenetics](https://en.wikipedia.org/wiki/Optogenetics?oldformat=true) to ask questions about what makes us tick. In the 21st century, nearly all aspects of ourselves are open for neuroscientific investigation: perception, movement, memory, decision making, learning, attention, disease, social-interaction, sleep, planning, etc. How these aspects of our lives are implemented by our neural circuits is still largely a mystery.

As neuroscience has matured, the advent of an entirely different discipline, computer science, has occurred mostly in parallel and dramatically changed our world and us along with it. Their intersection is where we are headed, but before we get there we must understand...

# What is computation?
### Long-Multiplication
For many, computation is often conflated with calculation, like performing arithmetic operations on numbers. However, our modern definition of computation captures a much broader concept which includes numerical calculations, but also much more. Nevertheless, calculations are good examples for getting acquainted with what computation *feels* like. Take finding the product of $17$ and $24$

$$
? = 17 \times 24
$$

To do this you most likely rely on the long-multiplication algorithm you learned in grade-school (although you might have not called it an "algorithm"). The process works by breaking down the problem into several easier, single-digit products called partial products, which we can sum together to get our answer. As a refresher let's quickly walk through it.

To start, let's write the two factors over one another in a diagram like so.

$$
\begin{array}{r}
17 \\
\underline{\times 24}
\end{array}
$$

Now, imagine a pointer placed underneath the first digit on our bottom factor, $4$, and imagine that the pointer allows us to write the number on a scratch pad followed by a times symbol.

The algorithm then instructs us to move the pointer to the first digit of our top factor and write it to the scratch pad as well.

We can easily solve this simpler multiplication problem by recalling our times tables to get $28$, which we write below the underline in our diagram, aligned with the first digits of our two factors. We then erase our scratch pad.

$$
\begin{array}{rcrcr}
& & \downarrow & & \downarrow
\\
17 & & 17 & & 17
\\
\underline{\times 24} & \enspace\implies & \underline{\times 24} & \enspace\implies & \underline{\times24}
\\
\enspace \uparrow & & & & 28
\\
4 \times & & 4 \times 7 &
\end{array}
$$

Next, we rewrite the first digit of our bottom factor to the scratch pad and move our pointer to the second digit of the top factor to get our second simpler product. Since our pointer is now focused on the second digit of our first factor, we additionally multiply this product by $10$ and then sum it with our previous partial product.

$$
\begin{array}{rcrcr}
\downarrow \enspace & & \downarrow \enspace
\\
17 & & 17 & & 17
\\
\underline{\times 24} & \enspace\implies & \underline{\times 24} & \enspace\implies & \underline{\times24}
\\
28 & & 28 & & 68
\end{array}
$$
$$
10 \times 4 \times 1
$$

We then repeat this process of multiplying the individual digits of $17$ and $24$, using the second digit in our bottom factor, multipling by $10$ for the first partial product, and $100$ for the second<sup>[7](#footnote_7)</sup>.

Finally, we can sum our two numbers to acquire our answer

$$
\begin{array}{r}
17 \\
\underline{\times 24} \\
68 \\
340
\end{array}
$$
$$
17 \times 24 = 68 + 340 = 408
$$


Although simple, the power of long-multiplication is that it is agnostic to the particular numbers you are multiplying; it is a general purpose set of logical steps that will *always* work if followed correctly. Long-multiplication is a useful example of an algorithm because it introduces several concepts foundational to models of computation.

First and foremost is the notion of ***state***. The state of our algorithm captures the current values of all our relevant variables, and the position we occupy in the sequence of our program. In our long-multiplication example, the state at any one moment might include: the two numbers we are multiplying, the current contents of the scratch pad, and whatever partial products we have constructed at that point. Critically, our current state is the unique determinant of our future state. This naturally leads to the notion of a ***transition rule*** (or transition function). This is the set of rules which instructs us what to do next given the current state. In long-multiplication, one such rule might be *"if two numbers are in the scratch pad, compute their product and add it to the current partial product"*, or *"if there are no unused digits in the top factor, move to the next unused digit in the bottom factor"*. These transitions are deterministic in the sense that, given the current state, they specify exactly what should happen next. For a given computation, we can represent the set of possible states and their transitions with a state diagram or flow-chart.

<div class='figure'>
    <img src="/assets/images/long-multiplication.svg"
         style="width: 400px; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 3.</span> Simple state diagram for the long-multiplication algorithm.
    </div>
</div>

Another critical component of computation is an ***alphabet***, the set of symbols we use to represent the information. In the long-multiplication example above, we chose to represent the numbers with Arabic numerals, however, we could have implemented the same abstract algorithm in any number system. By "same abstract algorithm", I mean we could still decompose the product into a sum of partial products. The set of possible states and transition rules however, would have to be different. For example, in Arabic numerals, shifting one position to the left means multiplying the corresponding digit by ten, whereas in binary, it means multiplying the corresponding digit by two. How we represent information matters for how we manipulate and process it.

$$
408 \quad 110011000 \quad \mathrm{CDIIV} \quad 四百〇八 \quad ៤០៨ \quad ፬፻፰ \quad ת"ח
$$

Finally, in the background there is some notion of a ***memory-space*** in which we perform the computation, and process the symbols. In our example using long-multiplication, this space would be the scratch pad on which we wrote out the initial problem, calculated the partial products, and wrote out our answer. 

All of these ideas may seem rather abstract, and in truth they are. Let's take a slight detour through the history of computer science to motivate why computation is formulated using these ideas.

### The Birth of Computer Science
In the 1930's, mathematicians and logicians were playing around with the ideas outlined above in an attempt to solve a challenge posed by the mathematician David Hilbert, the *Entscheidungsproblem* or *decision problem*. The challenge poses the following question:

***Is there an effective procedure (an algorithm) which, given a set of axioms and a mathematical proposition, decides whether it is or is not provable from the axioms?***

Stated less formally, the decision problem asks whether there is a general method that can always tell us, for any mathematical statement, if it can be proven from a given set of rules.

At the beginning of the 20th century, many mathematicians dreamed of formalizing all of mathematics such that every mathematical truth could be expressed as a statement of [first-order logic](https://en.wikipedia.org/wiki/First-order_logic?oldformat=true) in some systematic and precise symbolic language. If such a system existed then proving mathematical theorems wouldn't require intuition or inspiration, but would instead amount to following the instructions of some well-defined procedure, much like the long-multiplication algorithm. In other words, it could be automated. This naturally led to the decision problem, which asked whether a single universal procedure could take as input any mathematical statement, along with the rules and axioms of the system and determine whether a proof for the statement exists at all.

The answer to the decision problem would come in 1936, when Alan Turing and Alonzo Church independently proved that no such procedure could exist {% cite LambdaCalculus TuringMachine %}. In proving this however, both mathematicians needed to first formalize the notion of an effective-procedure or algorithm. In doing so, they essentially invented computer science and created frameworks that underlie all modern computing to this day.

In its modern definition, computation is the ***transformation of information according to some set of well-defined rules.*** The most famous model that realizes this definition is the one proposed by Turing, the [Turing machine](#appendix_two). To see how this model takes shape, let's take a high-level look at how a Turing Machine works.

### Turing Machines

<div class='figure'>
    <img src="/assets/images/turing_machine.gif"
         style="width: 400px; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 4.</span> An artists depiction of a mechanical Turing machine
    </div>
</div>
A Turing machine is an abstract computational device capable of reading from and writing to a strip of tape. The tape is imagined to be infinitely long and divided into discrete cells each containing a symbol from some alphabet. You can think about it as an infinitely long video tape where each frame on the tape contains one of our symbols. The symbols could be numbers from any number system, letters from any language, anything really, but critically we must be capable of deriving meaning through interpreting them.

Sitting above the the tape is a tape head, like those capable of reading and erasing cassettes or VHS tapes. At any moment, the head is positioned over one of the cells on the tape. The head also posseses an internal state, much like the state we discussed earlier. Depending on the current state of the head and the symbol it reads from the cell on the tape, the head may erase the cell, write a new symbol in its place, and move to the adjacent cell on the right or left.

That's it. That's a Turing machine.

I'm guessing that at this point, most readers will be unconvinced that such a bizarre device is capable of doing anything besides spinning tape around. To see how a Turing machine is a model of computation let's walk through an example. More specifically let's see how we can program a Turing machine to check if a sequence of symbols on the tape is palindromic.

We will keep our alphabet of symbols small $(a, b, \sqcup)$ where $\sqcup$ encodes a "blank" part of the tape. 

$$
\newcommand{\cell}[1]{\;\;#1\;\;}
\begin{array}{cccccccc}
\downarrow\! & & & & & & & &
\end{array}
\\
\begin{array}{|c|c|c|c|c|c|c|c|c|c|}
  \hline
  \cell{\cdots} & \cell{\sqcup} & \cell{\sqcup} & \cell{a} &
  \cell{b} & \cell{b} & \cell{a} &
  \cell{\sqcup} & \cell{\sqcup} & \cell{\cdots} \\
  \hline
\end{array}
$$

Our transition function can be written out as a table where our rows are our possible states, and our columns are the symbols of our alphabet.

$$
\begin{array}{c|ccc}
\text{} & a & b & \sqcup \\ \hline
\text{start}   & (\text{haveA},\sqcup,R) & (\text{haveB},\sqcup,R) & (\text{accept},\sqcup,R)\\
\text{haveA}   & (\text{haveA},a,R)      & (\text{haveA},b,R)      & (\text{matchA},\sqcup,L)\\
\text{haveB}   & (\text{haveB},a,R)      & (\text{haveB},b,R)      & (\text{matchB},\sqcup,L)\\
\text{matchA}  & (\text{back},\sqcup,L)  & (\text{reject},b,R)     & (\text{accept},\sqcup,R)\\
\text{matchB}  & (\text{reject},a,R)     & (\text{back},\sqcup,L)  & (\text{accept},\sqcup,R)\\
\text{back}    & (\text{back},a,L)       & (\text{back},b,L)       & (\text{start},\sqcup,R)
\end{array}
$$

To run the algorithm we can set the initial state to the $\text{start}$ state, and place our tape over the leftmost cell that isn't the $\sqcup$ symbol. In our case, this symbol is $a$. To run the algorithm, we consult our table for the $\text{start}$ position and $a$ symbol. The transition rule for this state and current symbol says to transition into the $\text{haveA}$ state, replace the $a$ symbol with a $\sqcup$ and move our head one position to the right $R$.

If we continue to follow this procedure, consulting the table and updating the machine, *and* our sequence is palindromic, we will eventually reach the $\text{accept}$ state which is a special state that ends the algorithm. At that point the tape should be filled with $\sqcup$. If however, our sequence of $a$ and $b$ is *not* palindromic, then we will eventually transition to the $\text{reject}$ state, which will also end the algorithm. You can think of the $\text{accept}$ state as returning the value $\text{True}$ and the $\text{reject}$ state as returning the value $\text{False}$.

Now, you still might not be convinced that this will work. I myself cannot look at the table and quickly understand the logic underlying the algorithm. However, you can see this exact procedure play out at [this link](https://turingmachine.io/). The authors of the website choose to represent the transition function as a state diagram rather than a table, which can help in understanding. See if you can figure out how the algorithm works by stepping through the transitions.

If you don't feel like doing that I will briefly outline how it works on the sequence $abba$. From the $\text{start}$ state, the algorithm transitions into the $\text{haveA}$ state and erases the first symbol $a$, replacing it with a $\sqcup$. The $\text{haveA}$ state instructs the tape to move right until it reaches the end of the sequence, encoded with a $\sqcup$. The machine then transitions to the $\text{matchA}$ state, and reverses once to reach the last symbol of the sequence. If the last symbol is **not** $a$ then the state transitions to the $\text{reject}$ state. If the last symbol **is** $a$ then it replaces it with a $\sqcup$, transitions into the $\text{back}$ state, and proceeds back to the beginning of the sequence. Now if the first and last symbol were the same then they will have both been erased and so we can just run the same steps again for this shorter sequence. The second time it will visit the $\text{haveB}$ and $\text{matchB}$ states, but the process will be identical. The algorithm uses the fact that if a sequence is palindromic, then we can remove the first and last symbols and that new sequence will still be a palindrome. If each subsequence obtained by deleting the first and last symbol is palindromic, then the entire sequence is palindromic.

Phew...

The big takeaway from this section is that Turing was able to show that this simple machine is capable of performing *any* computation, and executing *any* algorithm. In fact, the Turing machines simplicity is where its power of expression comes from; from simple primitive operations the Turing machine is capable of implementing computations of arbitrary complexity. From this one example, you may still not be convinced so I again suggest you go to the link above and checkout the other computations they have implemented.

Turing was actually able to go one step further and showed that one could construct a universal Turing machine, capable of simulating any other single-use Turing machine if given the correct instructions. At a high level, this is why modern computers are capable of running all kinds of different programs and software; the programming languages operating our computers are equivalent to universal Turing machines. Although Turing machines are the foundation of computing, modern digital computers are only equivalent to them in a *theoretical* sense. There is not a tape spinning around in your phone or laptop, and no one writes computer software by writing out elaborate transition tables [A1](#appendix_one). Todays computers rely on more efficient models of computation that have been designed in the decades following Turing and Church's original breakthroughs.

It wasn't only mathematicians and logicians that noticed Turings work. Neuroscientists were paying attention as well.

# What is neural computation?

### Neurons as Computers
For years, the neurophysiologist Warren McCulloch had attempted to develop a theory of mental atoms, which he dubbed "psychons". McCulloch believed there existed indivisible units of mental thought, like atoms in chemistry or genes in genetics. By the late 1920's, he had come to believe that the all-or-none action potential may indeed be those atoms, and that through excitation and inhibition, neural circuits used those atoms to perform "logical operations"{% cite talking_nets %}. Independently, the young biophysicist Walter Pitts had also come to see the brain as fundamentally a logical machine. Speaking retrospectively, the cognitive scientist Jerome Lettvin, a collaborator of theirs said as follows:

<blockquote style="font-style: italic">
"Quite independently, McCulloch and Pitts set about looking at the nervous system itself as a logical machine in the sense that if, indeed, one could take the firings of a nerve fiber as digital encoding of information, then the operation of nerve fibers on each other could be looked at in an arithmetical sense as a computer for combining and transforming sensory information."</blockquote>{% cite cybernetic %}

McCulloch and Pitts took the all-or-none nature of the action potential and used it to abstract neurons into simple binary machines which could be in one of two states: active (firing action potentials) or inactive (not firing action potentials). The genius in this move was to then map the active and inactive states of these neurons onto the binary states of $\text{True}$ and $\text{False}$ in formal logic. Under their theory, a neurons activity was not merely a physiological event, but the output of evaluating a logical proposition. Excitatory inputs act like affirmations of a proposition, while inhibitory inputs function like denials. By connecting excitatory and inhibitory neurons in specific patterns, neural networks could be used to implement logical operations such as $\text{AND}$, $\text{OR}$, and $\text{NOT}$. For example, a McCulloch Pitts neuron which has two inputs and only fires if both of its inputs are active effectively implements the $\text{AND}$ function (sometimes called an $\text{AND}$ gate).


<div class='figure'>
    <img src="/assets/images/MP_net.png"
         style="width: 400px; display: block; margin: 0 auto; margin-right: 125px"/>
    <div class='caption'>
        <span class='caption-label'>Figure 5.</span> A McCulloch Pit network that implements the $\text{AND}$ function
    </div>
</div>

Neuroscientists refer to this type of circuit as a [coincidence detector](https://en.wikipedia.org/wiki/Coincidence_detection_in_neurobiology?oldformat=true), and they are one of the most well characterized circuits we know of.

### Feature Detectors
Barlow, Hubel, difference of gaussians, conv nets maybe? Perceptron?
### Learning and Memory
Hebb, Hopfield
### Computation Through Dynamics

# Some loose ends...
### Organizing a Brain
The brain is not just a reservoir of neurons, there is deep structure.

<div class='figure-outset'>
    <img src="/assets/images/brain_fluor.jpg"
         style="width: 100%; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 2.</span> Depictions of pyramidal neurons in layers 4 and 5 of cortex by Santiago Ramón y Cajal.
    </div>
</div>

### Physical Computation
What is physical computation?
### Self-Organization
In a Turing machine there is a notion of observer, we decide the code, this doesn't exist in brains...
### Consciousness
What about consciousness?

## Footnotes
<a name="footnote_1"></a>
**1** Some might say that [Luigi Galvani](https://en.wikipedia.org/wiki/Luigi_Galvani?oldformat=true)—after whom the galvonometer is named—deserves this credit rather than Caton, however, Galvani discovered bioelectricity in the muscles, not in the brain. [Back to main text](#back_1)
<br>
<br>
<a name="footnote_2"></a>
**2** I got the 1% figure from my own calculation using the Allen Institutes [MERFISH datasets](https://knowledge.brain-map.org/data/5C0201JSVE04WY6DMVC/collections). There are some issues with using this method. For one, the dataset doesn't have any neuropeptide information (without looking into the genes themselves). More importantly though is that whether or not we can extrapolate the ratios of cell types from this dataset to the actual brain is not 100% clear. If you read this and know a better source for these numbers though let me know!
<br>
<br>
<a name="footnote_3"></a>
**3** Although it's true that they represent a small proportion of the total neurons, those neurons which *do* release the famous neurotransmitters have exceptionally widespread projections all over the brain. So it isn't particularly surprising from their physiology that they have an outsized impact on us.
<br>
<br>
<a name="footnote_4"></a>
**4** The reason it is complex is because of the types of receptors that each neurotransmitter can bind to. Serotonin, dopamine, endorphins, etc. all primarily use [metabotropic receptors](https://en.wikipedia.org/wiki/Metabotropic_receptor?oldformat=true) to exert their effects on the target cell. Glutamate and GABA use [ionotropic receptors](https://en.wikipedia.org/wiki/Ligand-gated_ion_channel?oldformat=true). Ionotropic receptors are ion channels and are relatively simple. When a neurotransmitter binds to an ionotropic receptor, they change shape and form a pore in the membrane that allows ions like sodium and potassium to rapidly flow into or out of the cell and change the membrane voltage. These ions can have second order effects by binding to proteins in the cell, but these are usually not the largest or most immediate effect. Metabotropic receptors on the other hand are massively complex; they allow neurotransmitter binding to be coupled to essentially any cellular process. Gene expression, modulation of ion channels, regulation of neurotransmitter release, changes in cellular metabolism, etc. Serotonin has 15 receptors, dopamine has 5, etc. These things get really complicated.
<br>
<br>
<a name="footnote_5"></a>
**5** Glutamate and GABA also have metabotropic receptors.
<br>
<br>
<a name="footnote_6"></a>
**6** Yes neurons integrate over both space *and* time! I thought this was too much detail for the main text, but I'll elaborate here. Basically, the base of a neurons axon, in the cell body, is where the action potential is generated. For those curious, it's because of a high density of sodium channels. What this means is that neurons can have differential influence on their downstream targets depending on where on the cell they form a synapse. If two neurons forms a synapse closer to the cell body—where the action potential is generated—it's influence will be greater compared to if it formed a synapse at the far tip of a dendrite. Its influence will be greater for two reasons: (1) the signal will be 
<br>
<br>
<a name="footnote_7"></a>
**7** You were probably not taught to multiply by 10, but instead to "carry" the digit by writing it above the tens place in the above factor and adding it to the second partial product. You end up doing the same calculation, but I bet that visually it's more intuitive for kids to learn then remembering to multiply by $10$ or $100$.


## Appendix
<a name="appendix_one"></a>**A1**<br>
Implementation of long-multiplication and palindrome checker in Python.
```python
def long_multiplication(x, y):
    # Extract individual digits from each number
    x_digits, y_digits = [], []
    for i, num in enumerate([x, y]):
        while num > 0:
            digit = num % 10
            if i == 0:
                x_digits.append(digit)
            else:
                y_digits.append(digit)
            num //= 10
    
    # Multiply digits by accumulating partial products
    partial_prod = 0
    for i, x_digit in enumerate(x_digits):
        for j, y_digit in enumerate(y_digits):
            # Use powers of ten to shift left
            small_product = (x_digit * y_digit) * (10 ** i) * (10 ** j)
            partial_prod += small_product

    return partial_prod

def is_palindrome(sequence):
    return sequence == sequence[::-1]
```
<a name="appendix_two"></a>**A2**<br>
**Turing Machine Formalism**

The contemporary formal definition of a Turing Machine is a $7$-tuple $M = (Q, \Gamma, b, \Sigma, \delta, q_0, F)$

$\Gamma$ is a finite, non=empty set of tape alphabet symbols.  
$b \in \Gamma$ is the blank symbol.  
$\Sigma \subseteq \Gamma \setminus \{b\}$ is the set of input symbols.  
$Q$ is a finite, non-empty set of states.  
$q_0 \in Q$ is the initial state.  
$F \subseteq Q$ is the set of final states or accepting states.   
$\delta : (Q \setminus F) \rightarrow Q \times \Gamma \times \{L, R\}$ is the transition function


## References
{% endkatexmm %}