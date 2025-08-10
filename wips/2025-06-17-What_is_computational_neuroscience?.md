---
layout: post
title: What is computational neuroscience?
subtitle: Here I go over the wtf comp neuro is
---

{% katexmm %}
# What is neuroscience?
An adult human brain weighs about 1.4kg, making up roughly 2% of a persons total body weight. Within that 1.4kg organ are some 86 billion neurons, commonly called brain cells. The distinguishing morphological feature of neurons, the feature which makes them different from all others cells in your body, is their arborescent form. Projecting from the central compartment of neurons are long, branching arms which extend outwards and nestle up against other neurons. These arms act essentially as antennae, receiving messages from and sending messages to other neurons, both near and far. Those projections which receive messages from other neurons are called *dendrites* and those that send messages are called *axons*. For some sense of scale, in humans the longest of these projections pass from the bottom of the spine all the way down to the foot, whilst the shortest may only span a few thousandths of a millimeter.

What do I mean by *"receiving messages from and sending messages to other neurons"*? Many of you will have heard that neurons "fire", whatever that means. When a neuron fires, it generates what is called an *action-potential*, a large, transient change of voltage within the cell. You can think of the action-potential as simply a pulse of electricity. Importantly, once initiated the action potential is an irreversible event; there is no $\frac{1}{2}$ action potential or $\frac{5}{6}$ action potential, it is an all-or-none event. After initiation, the action-potential travels down to the end of the axon known as the *"synapse"*, whereat the axon is nearly touching the dendrite of another neuron. The arrival of the action-potential at the synapse induces a biochemical cascade whose details we shall ignore, but which has (again ignoring details) one of two effects in the receiving cell: *excitation* or *inhibition*.

<div class='figure'>
    <img src="/assets/images/ram_image.png"
         style="width: 100%; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 1.</span> Depictions of pyramidal neurons in layers 4 and 5 of cortex by Santiago Ramón y Cajal.
    </div>
</div>

We call the first effect *"excitation"* because it makes the receiving cell *more* likely to fire. If the action-potentials arrival at the synapse causes *"inhibition"* in the receiving cell, it means it makes the receiving cell *less* likely to fire. Whether or not a neuron sends an excitatory or inhibitory signal is a property of that particular neuron. Importantly, an excitatory signal alone isn't enough to cause a neuron to fire, only if there is enough excitation, either from multiple neurons or from many excitatory signals arriving in quick succession, will the receiving neuron surpass its action-potential *threshold* and fire. This is the general logic of neural communication: neurons, depending on if they are excitatory or inhibitory, make their target neurons more or less likely to fire respectively; a neuron may receive input signals from hundreds, even thousands of neurons of both types, and through the integration of all those signals, may or may not fire at any one moment.

An additional layer of complexity is that, for any one neuron, each of its input neurons need not be equally influential in determining whether it will fire. An input from one cell may nearly guarantee a cell fires or doesn't fire, whereas input from a a different cell may have a relatively modest effect. Critically, this relative importance of a cells inputs is not static and can change over time.

With that laid out, we can finally get to what I believe is the problem statement of neuroscience:

***how is it that the collective dynamics in networks of billions of neurons enable the behaviors and cognitive processes that allow us to be successful agents in our environment?***

Framing the problem like this allows us to include all of the things neuroscientists study: *perception, movement, memory, decision making, learning, attention, disease, social-interaction, sleep, planning, etc.*

<div class='figure'>
    <img src="/assets/images/ram_image_2.jpg"
         style="width: 100%; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 1.</span> A drawing of the neurons in the spinal cord by Cajal.
    </div>
</div>

I've glossed over many important details in this brief introduction to neuroscience. Some additional but noncritical complexities are (1) neuromodulator neurons (noradrenaline, dopamine, serotonin) which don't fall neatly into the excitatory or inhibitory bucket, but play a large role in determining affective state, motivation, and arousal; (2) how action potentials, their propagation down axons, synaptic transmission, and [excitation/inhibition](https://en.wikipedia.org/wiki/Synaptic_potential?oldformat=true) are [biochemically implemented](https://en.wikipedia.org/wiki/Ion_channel?oldformat=true); and (3) the larger, organ-scale neuroanatomical structure and organization of the nervous system.

<!-- <div class='figure'>
    <img src="/assets/images/dense_neurons.jpeg"
         style="width: 100%; display: block; margin: 0 auto"/>
    <div class='caption'>
        <span class='caption-label'>Figure 1.</span> 
        The drawings of Cajal are beautiful, but can mislead one to think there are vast empty spaces between neurons. 
        In reality, real neurons are so densely packed that if we were to look at all of them simulatenously, we wouldn't really be able to see much of anything. 
        In this image from a 
        <a href="https://www.science.org/doi/10.1126/science.aay3134">2019 paper in Science</a>, 
        the cell bodies of neurons in a 0.5 cubic millimeter volume (black box) are shown with their dendrites and axons. 
        <em>Not</em> shown here are all the axons and dendrites from neurons <em>outside</em> of the volume which course next to and around the cells.
        In this 0.5 cubic millimeter volume there is 2.7 meters of neuronal cables, and 400,000 synapses!
    </div>
</div> -->



# What is computation?

For many, computation is often conflated with calculation, like performing arithmetic operations on numbers. However, our modern definition of computation is a much broader concept which captures numerical calculations, but also much more. Despite this, calculations are good examples for getting acquainted with what computation *feels* like. Take finding the product of $17$ and $24$

$$
? = 17 \times 24
$$

To do this you most likely rely on the long-multiplication algorithm you learned in grade-school. The algorithm works by breaking down the problem into several easier, single-digit products and a summation. As a refresher let's quickly walk through it.

To start, let's write the two factors over one another. We multiply the first digit in the first number by the first digit in the second number.

$$
\begin{array}{c}
\hspace{0.8em}17 \\
\underline{\times 24}
\end{array}
$$


Although simple, the power of long-multiplication is that it is agnostic to the particular numbers you are multiplying; it is a general purpose set of logical steps that will *always* work if followed correctly.

In its modern definition, computation is the *transformation of information according to some set of well-defined rules*.

The Wikipedia page on Information says that "Information is not knowledge itself, but the meaning that may be derived from a representation through interpretation."



# What is neural computation?
McCulloch-Pitts
Feature Detectors
	barlow
	difference of gaussians
Hopfield and memory
schultz
	reward prediction errors
ojas rule





# Some loose ends...

What is physical computation?
In a Turing machine there is a notion of observer, we decide the code, this doesn't exist in brains...
What about consciousness?


{% endkatexmm %}